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

export function parseDbtSchema(content: string): DbtModel[] {
    const models: DbtModel[] = [];
    try {
        const parsed = yaml.load(content) as any;

        if (parsed && parsed.models && Array.isArray(parsed.models)) {
            for (const modelDef of parsed.models) {
                models.push({
                    name: modelDef.name,
                    description: modelDef.description,
                    columns: (modelDef.columns || []).map((col: any) => ({
                        name: col.name,
                        description: col.description,
                        data_type: col.data_type,
                        tests: col.tests
                    }))
                });
            }
        }
    } catch (e) {
        throw new Error(`Invalid YAML: ${e}`);
    }
    return models;
}

export async function parseDbtProject(projectPath: string): Promise<DbtModel[]> {
    let models: DbtModel[] = [];
    const files = await getFiles(projectPath);

    for (const file of files) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const fileModels = parseDbtSchema(content);
                models = models.concat(fileModels);
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
