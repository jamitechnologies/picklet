import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { DbtModel, DbtColumn } from './parser'; // Reuse types

/**
 * Runs 'dbt compile' to generate manifest.json
 */
export async function generateDbtManifest(projectDir: string, profilesDir?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Assuming 'dbt' is available in the path or we use the venv
        // We'll try to use the venv python module invocation if possible, or assume global dbt
        // meaningful improvement: discover dbt path

        // For this environment, we know we installed it in a venv in the root
        const rootDir = path.resolve(__dirname, '../../..');
        const venvBin = path.join(rootDir, '.venv/bin/dbt');

        const dbtCmd = fs.existsSync(venvBin) ? venvBin : 'dbt';

        const args = ['compile', '--project-dir', projectDir];
        if (profilesDir) {
            args.push('--profiles-dir', profilesDir);
        }

        // We need to set DBT_PROFILES_DIR if not provided, or ensure profiles.yml exists
        // For the POC, we might need a dummy profiles.yml

        const proc = spawn(dbtCmd, args, {
            cwd: projectDir,
            env: { ...process.env, DBT_PARTIAL_PARSE: '1' }
        });

        let output = '';
        let error = '';

        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { error += data.toString(); });

        proc.on('error', (err) => {
            reject(err);
        });

        proc.on('close', (code) => {
            if (code === 0) {
                const manifestPath = path.join(projectDir, 'target', 'manifest.json');
                resolve(manifestPath);
            } else {
                reject(new Error(`dbt compile failed (code ${code}):\n${error}\n${output}`));
            }
        });
    });
}

/**
 * Parses manifest.json into internal DbtModel structure
 */
export async function parseDbtManifest(manifestPath: string): Promise<DbtModel[]> {
    try {
        const content = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(content);

        const models: DbtModel[] = [];

        // Iterate over nodes
        for (const key in manifest.nodes) {
            const node = manifest.nodes[key];
            if (node.resource_type === 'model') {
                const columns: DbtColumn[] = [];

                // Extract columns
                for (const colName in node.columns) {
                    const col = node.columns[colName];
                    columns.push({
                        name: col.name,
                        description: col.description,
                        data_type: normalizeType(col.data_type),
                        tests: [] // Manifest doesn't directly link tests to columns easily in this view, skipping for POC
                    });
                }

                models.push({
                    name: node.name,
                    description: node.description,
                    columns: columns
                });
            }
        }

        return models;
    } catch (e: any) {
        throw new Error(`Failed to parse manifest: ${e.message}`);
    }
}

function normalizeType(rawType: string): string | undefined {
    if (!rawType) return undefined;
    const lower = rawType.toLowerCase();
    if (lower.startsWith('varchar') || lower === 'string' || lower === 'text') return 'string';
    if (lower === 'integer' || lower === 'int' || lower === 'bigint') return 'integer';
    if (lower === 'boolean' || lower === 'bool') return 'boolean';
    if (lower.startsWith('timestamp') || lower === 'date') return 'timestamp';
    return rawType; // Return raw if not matched
}
