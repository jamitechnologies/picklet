import { githubApp, postComment } from '../lib/github';
import { formatPRComment, AnalysisResult } from '../lib/comment-formatter';

async function main() {
    console.log('--- PR Comment API Test ---\n');

    const owner = 'jamitechnologies';
    const repo = 'picklet';

    // 1. Get Installation
    let installationId: number | undefined;
    try {
        const installations = await githubApp.octokit.rest.apps.listInstallations();
        if (installations.data.length > 0) {
            installationId = installations.data[0].id;
            console.log(`✅ Using Installation ID: ${installationId}`);
        }
    } catch (e: any) {
        console.error('❌ Failed to list installations:', e.message);
        return;
    }

    if (!installationId) return;

    // 2. Find an open PR
    const octokit = await githubApp.getInstallationOctokit(installationId);
    let prNumber = 1;

    try {
        const prs = await octokit.rest.pulls.list({
            owner,
            repo,
            state: 'open',
            per_page: 1
        });

        if (prs.data.length > 0) {
            prNumber = prs.data[0].number;
            console.log(`✅ Found Open PR #${prNumber}: ${prs.data[0].title}`);
        } else {
            console.log(`⚠️ No open PRs found. Defaulting to #${prNumber} for testing (might 404).`);
        }
    } catch (e: any) {
        console.error('❌ Failed to list PRs:', e.message);
    }

    // 3. Format Comment
    const results: AnalysisResult[] = [
        {
            file: 'models/staging/stg_users.sql',
            changes: ['Field removed: email', 'Field added: phone_number'],
            violations: ['Required field "email" missing in contract'],
            severity: 'BREAKING'
        },
        {
            file: 'models/marts/dim_users.sql',
            changes: ['Description updated'],
            violations: [],
            severity: 'SAFE'
        }
    ];

    const body = formatPRComment(results);
    console.log('\nGenerated Comment Body Preview:');
    console.log('---------------------------------');
    console.log(body.substring(0, 150) + '...');
    console.log('---------------------------------');

    // 4. Post Comment
    console.log(`\nPosting comment to PR #${prNumber}...`);
    try {
        await postComment(installationId, owner, repo, prNumber, body);
        console.log(`✅ Successfully posted/updated comment on PR #${prNumber}`);
    } catch (e: any) {
        if (e.status === 404) {
            console.log(`⚠️ PR #${prNumber} not found (expected if no open PRs). API call valid though.`);
        } else {
            console.error(`❌ Failed to post comment: ${e.message}`);
        }
    }
}

main();
