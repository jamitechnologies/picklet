import { Contract, ContractColumn } from './contract-types';
import { ColumnDefinition, checkTypeCompatibility } from './classifier';

export interface Violation {
    level: 'ERROR' | 'WARNING' | 'INFO';
    type: 'MISSING_COLUMN' | 'TYPE_MISMATCH' | 'NULLABILITY_MISMATCH';
    message: string;
    impactedConsumers: string[];
}

export interface ValidationReport {
    valid: boolean;
    violations: Violation[];
}

export function validateAgainstContract(contract: Contract, actualColumns: ColumnDefinition[]): ValidationReport {
    const violations: Violation[] = [];
    const requiredColumns = contract.contract.schema || [];
    const consumers = contract.contract.consumers?.map(c => c.name) || [];
    const enforcement = contract.contract.enforcement_level;

    // Helper to map severity based on enforcement level
    // strict: ERROR for everything
    // warn: WARNING for everything
    // none: INFO
    const mapSeverity = (baseSeverity: 'BREAKING' | 'RISKY' | 'SAFE'): 'ERROR' | 'WARNING' | 'INFO' => {
        if (enforcement === 'none') return 'INFO';
        if (enforcement === 'warn') return 'WARNING';
        // enforcement === 'strict'
        return baseSeverity === 'BREAKING' ? 'ERROR' : 'WARNING';
    };

    // Create a map of actual columns for O(1) lookup
    const actualMap = new Map(actualColumns.map(c => [c.name, c]));

    for (const reqCol of requiredColumns) {
        const actualCol = actualMap.get(reqCol.name);

        if (!actualCol) {
            // Missing Column
            violations.push({
                level: enforcement === 'strict' ? 'ERROR' : (enforcement === 'warn' ? 'WARNING' : 'INFO'),
                type: 'MISSING_COLUMN',
                message: `Required column '${reqCol.name}' is missing from schema.`,
                impactedConsumers: consumers
            });
            continue;
        }

        // Check Type Compatibility
        const compatibility = checkTypeCompatibility(reqCol.type, actualCol.type);
        if (compatibility === 'BREAKING') {
            violations.push({
                level: mapSeverity('BREAKING'),
                type: 'TYPE_MISMATCH',
                message: `Column '${reqCol.name}' type mismatch. Contract expects '${reqCol.type}', found '${actualCol.type}'.`,
                impactedConsumers: consumers
            });
        } else if (compatibility === 'RISKY') {
            violations.push({
                level: 'WARNING', // Risky is usually just a warning unless we are super strict?
                type: 'TYPE_MISMATCH',
                message: `Column '${reqCol.name}' type change is risky. Contract expects '${reqCol.type}', found '${actualCol.type}'.`,
                impactedConsumers: consumers
            });
        }

        // Check Nullability
        // Contract says not null (nullable: false), but actual is nullable (true) -> Violation
        if (reqCol.nullable === false && actualCol.isNullable === true) {
            violations.push({
                level: mapSeverity('BREAKING'),
                type: 'NULLABILITY_MISMATCH',
                message: `Column '${reqCol.name}' is nullable in schema but required (not null) in contract.`,
                impactedConsumers: consumers
            });
        }
    }

    const hasErrors = violations.some(v => v.level === 'ERROR');

    return {
        valid: !hasErrors,
        violations
    };
}
