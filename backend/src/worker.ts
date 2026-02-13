import { setupWorker } from './lib/queue';
import { getPullRequestFiles, ChangedFile, createCheckRun, updateCheckRun, postComment } from './lib/github';
import { formatPRComment, AnalysisResult } from './lib/comment-formatter';

// Define the PRJobData interface (assuming it's not imported)
interface PRJobData {
    prNumber: number;
    repoName: string;
    installationId: number;
    headSha: string;
}

async function processPRJob(data: PRJobData) {
    console.log(`[Worker] Processing PR #${data.prNumber} in ${data.repoName}...`);

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
        console.log(`[Worker] Created Check Run ID: ${checkRunId}`);

        // Update to In Progress
        await updateCheckRun(data.installationId, owner, repo, checkRunId, 'in_progress');

    } catch (e: any) {
        console.error(`[Worker] Failed to create check run:`, e.message);
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

            // Stubbing Analysis Results for Day 29
            // In a real scenario, we would parse these files here.
            analysisResults = relevantFiles.map(f => ({
                file: f.filename,
                changes: [`File was ${f.status}`],
                violations: [], // No actual validation yet without the full engine on these specific files
                severity: 'SAFE'
            }));

            summary += `\n\n**Schema Files Modified:**\n` +
                relevantFiles.map(f => `- \`${f.filename}\` (${f.status})`).join('\n');
            conclusion = 'neutral';
        } else {
            console.log(`[Worker] No schema-relevant files changed.`);
            summary += `\n\nNo schema changes detected.`;
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
