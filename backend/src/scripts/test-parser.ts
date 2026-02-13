import * as path from 'path';
import { parseDbtProject } from '../lib/parser';

async function main() {
    const projectPath = path.resolve(__dirname, '../../../examples/test-dbt-project');
    console.log(`Parsing project at: ${projectPath}`);

    try {
        const models = await parseDbtProject(projectPath);
        console.log('Parsed Models:');
        console.log(JSON.stringify(models, null, 2));

        // Simple validation
        const stgUsers = models.find(m => m.name === 'stg_users');
        if (stgUsers) {
            console.log('\n✅ Found stg_users model');
            if (stgUsers.columns.length === 3) {
                console.log('✅ Correct column count (3)');
            } else {
                console.error(`❌ Expected 3 columns, found ${stgUsers.columns.length}`);
            }
        } else {
            console.error('\n❌ Could not find stg_users model');
        }

    } catch (error) {
        console.error('Error parsing project:', error);
    }
}

main();
