import { githubApp } from '../lib/github';

async function main() {
    const owner = 'jamitechnologies';
    const repo = 'picklet';
    const head = 'test/schema-check';
    const base = 'main'; // Adjust if default branch is master

    console.log(`Creating PR ${head} -> ${base}...`);

    try {
        // Get Installation first
        const installations = await githubApp.octokit.rest.apps.listInstallations();
        if (installations.data.length === 0) {
            console.error('No installations found.');
            return;
        }
        const installationId = installations.data[0].id;
        const octokit = await githubApp.getInstallationOctokit(installationId);

        const response = await octokit.rest.pulls.create({
            owner,
            repo,
            title: 'Test PR: Schema Check',
            head,
            base,
            body: 'This is a test PR created by the Picket bot for verification.'
        });

        console.log(`✅ Created PR #${response.data.number}: ${response.data.html_url}`);
    } catch (e: any) {
        console.error(`❌ Failed to create PR: ${e.message}`);
        if (e.response && e.response.data.errors) {
            console.error('Errors:', JSON.stringify(e.response.data.errors, null, 2));
        }
    }
}

main();
