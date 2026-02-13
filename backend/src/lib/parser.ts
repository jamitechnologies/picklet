import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface DbtColumn {
    name: string;
    description?: string;
    data_type?: string;
    tests?: any[];
}

export interface DbtModel {
    name: string;
    description?: string;
    columns: DbtColumn[];
}

export interface DbtSchema {
    version: number;
    models: DbtModel[];
}

export async function parseDbtProject(projectPath: string): Promise<DbtModel[]> {
    const models: DbtModel[] = [];
    const files = await getFiles(projectPath);

    for (const file of files) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
            // Check if it's a schema file (heuristic: has 'models' key)
            try {
                const content = fs.readFileSync(file, 'utf8');
                const parsed = yaml.load(content) as any;

                if (parsed && parsed.models && Array.isArray(parsed.models)) {
                    // It's a dbt schema file
                    for (const modelDef of parsed.models) {
                        models.push({
                            name: modelDef.name,
                            description: modelDef.description,
                            columns: modelDef.columns || []
                        });
                    }
                }
            } catch (e) {
                console.warn(`Failed to parse ${file}:`, e);
            }
        }
    }

    return models;
}

async function getFiles(dir: string): Promise<string[]> {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}
