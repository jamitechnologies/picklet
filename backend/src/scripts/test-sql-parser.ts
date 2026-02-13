import * as fs from 'fs';
import * as path from 'path';
import { parseMigration } from '../lib/sql-parser';

async function main() {
    const migrationsDir = path.resolve(__dirname, '../../../examples/test-migrations');
    console.log(`Parsing migrations from: ${migrationsDir}\n`);

    try {
        const files = fs.readdirSync(migrationsDir).sort();

        for (const file of files) {
            if (file.endsWith('.sql')) {
                const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                console.log(`--- ${file} ---`);
                const changes = parseMigration(content);
                changes.forEach(change => {
                    console.log(`[${change.type}] ${change.details}`);
                });
                console.log('');
            }
        }

    } catch (error) {
        console.error('Error running sql parser test:', error);
    }
}

main();
