import * as path from 'path';
import * as fs from 'fs';
import { generateDbtManifest, parseDbtManifest } from '../lib/dbt-manifest';

async function main() {
    // Use the test project from week 1
    const projectDir = path.resolve(__dirname, '../../../examples/test-dbt-project');

    // Create a dummy profiles.yml because dbt needs one
    const profilesPath = path.join(projectDir, 'profiles.yml');
    const dummyProfile = `
default:
  target: dev
  outputs:
    dev:
      type: postgres
      host: localhost
      user: picket_user
      password: picket_password
      dbname: picket_db
      port: 5433
      schema: public
      threads: 1
`;
    // Always write to ensure correct credentials
    fs.writeFileSync(profilesPath, dummyProfile);

    console.log(`Generating manifest for: ${projectDir}`);

    try {
        const manifestPath = await generateDbtManifest(projectDir, projectDir); // Use project dir as profiles dir
        console.log(`Manifest generated at: ${manifestPath}`);

        const models = await parseDbtManifest(manifestPath);
        console.log('Parsed Models from Manifest:');
        console.log(JSON.stringify(models, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }

    // Test Error Handling
    console.log('\nTesting Invalid Project Path:');
    try {
        await generateDbtManifest('/invalid/path/to/project');
    } catch (error: any) {
        console.log('Caught expected error:', error.message.split('\n')[0]);
    }
}

main();
