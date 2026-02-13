import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Contract } from './contract-types'; // Assumed to exist from previous step
import { validateContractContent } from './contract-validator'; // Assumed to exist

export interface ContractConfig {
    contractPaths?: string[]; // Glob patterns or directories
}

export interface LoadedContract {
    filePath: string;
    contract: Contract;
    resourceKey: string; // "type:name"
}

export class ContractLoader {
    private contracts: LoadedContract[] = [];

    constructor(private rootDir: string) { }

    /**
     * Scans for contracts in common locations:
     * - .picket/contracts.yml
     * - .picket/contracts/*.{yml,yaml}
     * - contracts/*.{yml,yaml}
     * - picket.yml (if it contains a contract definition)
     */
    public loadContracts(config?: ContractConfig): LoadedContract[] {
        this.contracts = [];
        const searchPaths = config?.contractPaths || [
            '.picket/contracts.yml',
            '.picket/contracts',
            'contracts'
        ];

        for (const relativePath of searchPaths) {
            const fullPath = path.resolve(this.rootDir, relativePath);
            if (fs.existsSync(fullPath)) {
                this.scanPath(fullPath);
            }
        }

        return this.contracts;
    }

    private scanPath(entryPath: string) {
        const stat = fs.statSync(entryPath);
        if (stat.isDirectory()) {
            const files = fs.readdirSync(entryPath);
            for (const file of files) {
                if (file.endsWith('.yml') || file.endsWith('.yaml')) {
                    this.loadFilePath(path.join(entryPath, file));
                }
            }
        } else {
            if (entryPath.endsWith('.yml') || entryPath.endsWith('.yaml')) {
                this.loadFilePath(entryPath);
            }
        }
    }

    private loadFilePath(filePath: string) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = yaml.load(content) as any;

            // Handle multi-document yaml if needed, or just single
            // For now assuming single document per file or array of contracts?
            // The spec says strict YAML format. Let's assume root object is Contract (with version key)

            if (data && data.version && data.contract) {
                const validation = validateContractContent(data);
                if (validation.valid) {
                    const contract = data as Contract;
                    const resourceKey = `${contract.contract.resource.type}:${contract.contract.resource.name}`;
                    this.contracts.push({
                        filePath,
                        contract,
                        resourceKey
                    });
                } else {
                    console.warn(`Skipping invalid contract at ${filePath}: ${validation.errors?.join(', ')}`);
                }
            }
        } catch (e) {
            console.warn(`Failed to read/parse contract at ${filePath}: ${e}`);
        }
    }

    /**
     * Finds a contract for a given resource.
     * Supports exact match and basic wildcards (*).
     */
    public findContract(resourceType: string, resourceName: string): Contract | undefined {
        // 1. Exact Match
        const exactKey = `${resourceType}:${resourceName}`;
        const exactMatch = this.contracts.find(c => c.resourceKey === exactKey);
        if (exactMatch) return exactMatch.contract;

        // 2. Wildcard Match
        // We look for contracts where the name contains '*'
        // e.g. "stg_*" matches "stg_users"
        const wildcardMatches = this.contracts.filter(c => {
            if (c.contract.contract.resource.type !== resourceType) return false;
            const pattern = c.contract.contract.resource.name;
            if (!pattern.includes('*')) return false;

            // Simple regex conversion: escape special chars, replace * with .*
            const regexStr = '^' + pattern.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$';
            const regex = new RegExp(regexStr);
            return regex.test(resourceName);
        });

        // Sort by specificity? (Length of pattern maybe)
        // For now take the first valid wildcard match
        if (wildcardMatches.length > 0) {
            // Pick the one with the longest pattern (most specific?)
            wildcardMatches.sort((a, b) => b.contract.contract.resource.name.length - a.contract.contract.resource.name.length);
            return wildcardMatches[0].contract;
        }

        return undefined;
    }
}
