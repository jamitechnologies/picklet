import { getPullRequestFiles, getFileContents } from '../lib/github';
import { githubApp } from '../lib/github';

async function main() {
    console.log('--- GitHub API Client Test ---\n');

    // 1. Get Installation ID (assumes you have installed the app on at least one repo)
    let installationId: number | undefined;
    try {
        const installations = await githubApp.octokit.rest.apps.listInstallations();
        if (installations.data.length > 0) {
            installationId = installations.data[0].id;
            console.log(`✅ Using Installation ID: ${installationId} (${installations.data[0].account?.login})`);
        } else {
            console.error('❌ No installations found. Please install the App on a repo first.');
            process.exit(1);
        }
    } catch (error: any) {
        console.error('❌ Failed to list installations:', error.message);
        process.exit(1);
    }

    if (!installationId) return;

    // 2. Test: Get File Contents (README.md)
    // We assume the first repo is where we installed it.
    // Let's list repos for this installation to be safe.
    // Actually, getting an access token is per installation.
    // We can list accessible repos.
    // But for simplicity, user likely installed on 'picklet'.
    const owner = 'jamitechnologies'; // derived? or hardcoded for test?
    const repo = 'picklet';
    // We can try to derive owner/repo from installation data if possible, or just hardcode for your specific test case
    // The previous test script output: "Account: jamitechnologies".

    console.log(`\n--- Fetching README.md from ${owner}/${repo} ---`);
    try {
        const content = await getFileContents(installationId, owner, repo, 'README.md');
        if (content) {
            console.log(`✅ Successfully fetched README.md (${content.length} bytes)`);
            console.log(`Preview: ${content.substring(0, 50)}...`);
        } else {
            console.error('❌ README.md not found or null.');
        }
    } catch (e: any) {
        console.error('❌ Failed to fetch file:', e.message);
    }

    // 3. Test: List PR Files
    // Pass a known PR number if you have one. If not, this might fail 404.
    const prNumber = 1; // Try PR #1? Or user can update this.
    console.log(`\n--- Fetching files for PR #${prNumber} ---`);
    try {
        const files = await getPullRequestFiles(installationId, owner, repo, prNumber);
        console.log(`✅ Found ${files.length} changed files in PR #${prNumber}:`);
        files.forEach(f => console.log(`   - [${f.status}] ${f.filename}`));
    } catch (e: any) {
        console.error(`❌ Failed to list PR files (PR #${prNumber} might not exist):`, e.message);
    }
}

main();
