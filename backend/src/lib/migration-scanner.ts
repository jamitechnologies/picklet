import * as fs from 'fs';
import * as path from 'path';

export interface MigrationFile {
    path: string;
    name: string;
}

export function scanMigrations(rootDir: string, pattern?: RegExp): MigrationFile[] {
    const migrations: MigrationFile[] = [];
    const defaultPattern = /\.sql$/;
    const searchPattern = pattern || defaultPattern;

    function traverse(currentDir: string) {
        const files = fs.readdirSync(currentDir);

        for (const file of files) {
            const fullPath = path.join(currentDir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Heuristic: Don't traverse node_modules or .git
                if (file !== 'node_modules' && file !== '.git' && file !== 'target') {
                    traverse(fullPath);
                }
            } else if (stat.isFile()) {
                if (searchPattern.test(file)) {
                    migrations.push({
                        path: fullPath,
                        name: file
                    });
                }
            }
        }
    }

    if (fs.existsSync(rootDir)) {
        traverse(rootDir);
    }

    // Sort by name ensures reasonable order for numbered migrations
    return migrations.sort((a, b) => a.name.localeCompare(b.name));
}
