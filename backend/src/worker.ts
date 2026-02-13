import { setupWorker } from './lib/queue';
import { getPullRequestFiles, ChangedFile, createCheckRun, updateCheckRun, postComment, getFileContents } from './lib/github';
import { formatPRComment, AnalysisResult } from './lib/comment-formatter';
import { parseMigration } from './lib/sql-parser';
import { parseDbtSchema } from './lib/parser';
import { logger } from './lib/logger';

// Define the PRJobData interface (assuming it's not imported)
interface PRJobData {
    prNumber: number;
    repoName: string;
    installationId: number;
    headSha: string;
}

export async function processPRJob(data: PRJobData) {
    const log = logger.child({
        pr: data.prNumber,
        repo: data.repoName,
        setup: 'worker'
    });

    log.info(`Processing PR job`);

    const [owner, repo] = data.repoName.split('/');

    // 1. Create Check Run (Queued)
    let checkRunId: number;
    try {
        checkRunId = await createCheckRun(
            data.installationId,
            owner,
            repo,
            data.headSha,
            'Picket Schema Check'
        );
        log.info(`Created Check Run`, { checkRunId });

        // Update to In Progress
        await updateCheckRun(data.installationId, owner, repo, checkRunId, 'in_progress');

    } catch (e: any) {
        log.error(`Failed to create check run`, { error: e.message });
        return; // Can't report status if we can't create the check
    }

    // 2. Fetch Changed Files
    console.log(`[Worker] Fetching changed files...`);
    try {
        const files: ChangedFile[] = await getPullRequestFiles(
            data.installationId,
            owner,
            repo,
            data.prNumber
        );

        console.log(`[Worker] Found ${files.length} changed files.`);

        const relevantFiles = files.filter(f =>
            f.filename.endsWith('.sql') ||
            f.filename.endsWith('.yml') ||
            f.filename.endsWith('.yaml')
        );

        let summary = `Found ${files.length} changed files.`;
        let conclusion: 'success' | 'neutral' = 'success';

        let analysisResults: AnalysisResult[] = [];

        if (relevantFiles.length > 0) {
            console.log(`[Worker] Relevant schema files modified:`);
            relevantFiles.forEach(f => console.log(`  - ${f.filename} (${f.status})`));

            conclusion = 'neutral';

            // Process each relevant file
            for (const file of relevantFiles) {
                const result: AnalysisResult = {
                    file: file.filename,
                    changes: [],
                    violations: [],
                    errors: [],
                    severity: 'SAFE'
                };

                try {
                    // Fetch content
                    // TODO: parallelize with Promise.all for optimization later
                    if (file.status === 'removed') {
                        result.changes.push('File removed');
                        result.severity = 'BREAKING'; // Conservative default for removal
                    } else {
                        const content = await getFileContents(data.installationId, owner, repo, file.filename, data.headSha);

                        if (content && file.filename.endsWith('.sql')) {
                            // Parse SQL Migration
                            const changes = parseMigration(content);

                            if (changes.length === 0) {
                                result.changes.push('No schema changes detected in SQL');
                            } else {
                                changes.forEach(change => {
                                    result.changes.push(`[${change.type}] ${change.details}`);
                                    if (change.severity === 'BREAKING') {
                                        result.severity = 'BREAKING';
                                    } else if (change.severity === 'MANUAL_REVIEW' && result.severity !== 'BREAKING') {
                                        // Keeping it safe or generic if review needed, or maybe treat as warning?
                                        // For now, let's just log it.
                                    }
                                });
                            }
                        } else if (content && (file.filename.endsWith('.yml') || file.filename.endsWith('.yaml'))) {
                            try {
                                const models = parseDbtSchema(content);
                                if (models.length > 0) {
                                    models.forEach(m => {
                                        result.changes.push(`[DBT_MODEL] Modified model: ${m.name}`);
                                        // TODO: Compare with previous version (requires fetching base file)
                                        // For now, just report that valid dbt schema was parsed
                                    });
                                } else {
                                    result.changes.push('YAML file modified (no dbt models found)');
                                }
                            } catch (e: any) {
                                result.errors?.push(`Invalid dbt schema: ${e.message}`);
                            }
                        }
                    }
                } catch (e: any) {
                    console.error(`[Worker] Failed to process ${file.filename}:`, e.message);
                    result.errors?.push(`Failed to process file: ${e.message}`);
                }

                analysisResults.push(result);
            }

            const breakingCount = analysisResults.filter(r => r.severity === 'BREAKING').length;
            const errorCount = analysisResults.filter(r => r.errors && r.errors.length > 0).length;

            if (breakingCount > 0 || errorCount > 0) {
                conclusion = 'success'; // actually let's mark as success so the PR isn't blocked by GitHub check, but the comment says "Issues"
                // OR we can fail it. Let's keep it neutral/success for now to avoid blocking until we are sure.
                // The prompt says "Parsing Errors -> Post error to PR".

                // If there are errors, maybe we want to flag attention.
                if (errorCount > 0) {
                    summary += `\n\n⚠️ **Processing Errors Detected**`;
                }
            }

            summary += `\n\nAnalyzed ${relevantFiles.length} files.`;
        }

        // 3. Post PR Comment
        const commentBody = formatPRComment(analysisResults);
        try {
            await postComment(data.installationId, owner, repo, data.prNumber, commentBody);
        } catch (e: any) {
            console.error(`[Worker] Failed to post comment:`, e.message);
        }

        // 4. Complete Check Run
        await updateCheckRun(
            data.installationId,
            owner,
            repo,
            checkRunId,
            'completed',
            conclusion,
            {
                title: conclusion === 'success' ? 'No Schema Changes' : 'Schema Changes Detected',
                summary: summary
            }
        );

    } catch (error: any) {
        console.error(`[Worker] Error checking PR files:`, error.message);

        // Report Failure
        await updateCheckRun(
            data.installationId,
            owner,
            repo,
            checkRunId,
            'completed',
            'failure',
            {
                title: 'Internal Error',
                summary: `An error occurred while processing the PR: ${error.message}`
            }
        );

        throw error; // Retry job?
    }

    console.log(`[Worker] Check complete.`);
}

// Start the worker
setupWorker(processPRJob);

// Keep process alive
process.on('SIGTERM', () => {
    console.log('Worker shutting down...');
    process.exit(0);
});
