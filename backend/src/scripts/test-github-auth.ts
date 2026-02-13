import { githubApp } from '../lib/github';

async function main() {
    console.log('--- GitHub App Auth Test ---\n');

    if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY) {
        console.error('❌ Missing GITHUB_APP_ID or GITHUB_PRIVATE_KEY in .env');
        process.exit(1);
    }

    try {
        // Authenticate as App (JWT)
        const appAuth = await githubApp.octokit.rest.apps.getAuthenticated();
        console.log(`✅ Authenticated as App: ${appAuth.data?.name} (ID: ${appAuth.data?.id})`);

        // List Installations
        const installations = await githubApp.octokit.rest.apps.listInstallations();
        console.log(`found ${installations.data.length} installations:`);

        for (const inst of installations.data) {
            console.log(`  - Installation ID: ${inst.id}`);
            console.log(`    Account: ${inst.account?.login} (${inst.account?.type})`);
            console.log(`    Repository Selection: ${inst.repository_selection}`);

            // Try to get an installation token
            const octokit = await githubApp.getInstallationOctokit(inst.id);
            const { data: { token } } = await octokit.rest.apps.createInstallationAccessToken({
                installation_id: inst.id
            });
            console.log(`    ✅ Generated Installation Token (expires: ${token.substring(0, 10)}...)`);
        }

    } catch (error: any) {
        console.error('❌ Authentication failed:', error.message);
        if (error.status === 401) {
            console.error('   Check your Private Key and App ID.');
        }
    }
}

main();
