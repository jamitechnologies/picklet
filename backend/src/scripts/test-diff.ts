import * as path from 'path';
import { parseDbtProject } from '../lib/parser';
import { diffSchemas } from '../lib/diff';

async function main() {
    const v1Path = path.resolve(__dirname, '../../../examples/test-dbt-project');
    const v2Path = path.resolve(__dirname, '../../../examples/test-dbt-project-v2');

    console.log(`Comparing:\n V1: ${v1Path}\n V2: ${v2Path}\n`);

    try {
        const v1Models = await parseDbtProject(v1Path);
        const v2Models = await parseDbtProject(v2Path);

        const changes = diffSchemas(v1Models, v2Models);

        console.log('Detected Changes:');
        if (changes.length === 0) {
            console.log('No changes detected.');
        } else {
            changes.forEach(change => {
                const symbol = change.changeType === 'ADDED' ? '+' :
                    change.changeType === 'REMOVED' ? '-' : '~';
                const colText = change.columnName ? `.${change.columnName}` : '';
                console.log(`${symbol} [${change.changeType}] ${change.modelName}${colText}: ${change.details}`);
                if (change.changeType === 'MODIFIED') {
                    console.log(`    Old: ${change.oldValue}`);
                    console.log(`    New: ${change.newValue}`);
                }
            });
        }

    } catch (error) {
        console.error('Error running diff:', error);
    }
}

main();
