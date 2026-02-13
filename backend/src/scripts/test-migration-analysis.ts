import * as path from 'path';
import * as fs from 'fs';
import { scanMigrations } from '../lib/migration-scanner';
import { parseMigration } from '../lib/sql-parser';

async function main() {
    const migrationsDirs = [
        path.resolve(__dirname, '../../../examples/test-migrations'),
        path.resolve(__dirname, '../../../examples/complex-migrations')
    ];

    console.log('--- Migration Analysis Report ---\n');

    for (const dir of migrationsDirs) {
        console.log(`Scanning: ${dir}`);
        const files = scanMigrations(dir);

        if (files.length === 0) {
            console.log('  No migrations found.');
            continue;
        }

        for (const file of files) {
            console.log(`\nFile: ${file.name}`);
            const content = fs.readFileSync(file.path, 'utf8');
            const changes = parseMigration(content);

            changes.forEach(change => {
                const icon = change.severity === 'BREAKING' ? '❌' :
                    change.severity === 'SAFE' ? '✅' : '⚠️';
                console.log(`  ${icon} [${change.severity}] ${change.type}: ${change.details}`);
            });
        }
        console.log('\n-----------------------------------');
    }
}

main();
