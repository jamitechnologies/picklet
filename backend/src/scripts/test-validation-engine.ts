import { validateAgainstContract, ValidationReport } from '../lib/validation-engine';
import { Contract } from '../lib/contract-types';
import { ColumnDefinition } from '../lib/classifier';

function printReport(name: string, report: ValidationReport) {
    const icon = report.valid ? '✅' : '❌';
    console.log(`${icon} Test: ${name}`);
    if (report.violations.length > 0) {
        report.violations.forEach(v => {
            const levelIcon = v.level === 'ERROR' ? '🔴' : (v.level === 'WARNING' ? '⚠️' : 'ℹ️');
            console.log(`     ${levelIcon} [${v.level}] ${v.type}: ${v.message}`);
        });
    } else {
        console.log('     No violations.');
    }
    console.log('');
}

const strictContract: Contract = {
    version: "1.0",
    contract: {
        name: "Strict User Contract",
        owner: "team-a",
        resource: { type: "dbt_model", name: "users" },
        enforcement_level: "strict",
        consumers: [{ name: "dashboard", owner: "team-b", criticality: "high" }],
        schema: [
            { name: "id", type: "integer", nullable: false },
            { name: "email", type: "text", nullable: true }
        ]
    }
};

const warnContract: Contract = {
    version: "1.0",
    contract: {
        ...strictContract.contract,
        name: "Warn User Contract",
        enforcement_level: "warn"
    }
} as Contract;

// Scenarios

// 1. Perfect Match
printReport('Perfect Match (Strict)', validateAgainstContract(strictContract, [
    { name: "id", type: "integer", isNullable: false },
    { name: "email", type: "text", isNullable: true }
]));

// 2. Extra Columns (Should be safe, contract only enforces existence of required)
printReport('Extra Columns (Strict)', validateAgainstContract(strictContract, [
    { name: "id", type: "integer", isNullable: false },
    { name: "email", type: "text", isNullable: true },
    { name: "phone", type: "text", isNullable: true }
]));

// 3. Missing Column
printReport('Missing Column (Strict)', validateAgainstContract(strictContract, [
    { name: "id", type: "integer", isNullable: false }
]));

// 4. Missing Column (Warn)
printReport('Missing Column (Warn)', validateAgainstContract(warnContract, [
    { name: "id", type: "integer", isNullable: false }
]));

// 5. Type Mismatch (Strict)
printReport('Type Mismatch (Strict)', validateAgainstContract(strictContract, [
    { name: "id", type: "boolean", isNullable: false }, // boolean != integer
    { name: "email", type: "text", isNullable: true }
]));

// 6. Compatible type (Safe widening check)
// Contract expects integer, but strict check typically wants exact or compatible.
// Our classifier says int->bigint is SAFE.
// Let's check if the validator respects that.
// Actually, validateAgainstContract logic currently says checkTypeCompatibility(req, actual).
// If req=int and actual=bigint. checkTypeCompatibility(int, bigint) -> SAFE (widening logic is order dependent).
// Wait, checkTypeCompatibility(old, new).
// Here Old is Contract (Expected), New is Actual.
// If Contract=Int, Actual=Bigint. This is effectively changing Int to Bigint.
// That is SAFE.
// If Contract=Bigint, Actual=Int.
// checkTypeCompatibility(bigint, integer) -> BREAKING.
printReport('Type Compatible Widening (Strict)', validateAgainstContract(strictContract, [
    { name: "id", type: "bigint", isNullable: false }, // int -> bigint is safe
    { name: "email", type: "text", isNullable: true }
]));

// 7. Nullability Mismatch
printReport('Nullability Mismatch (Strict)', validateAgainstContract(strictContract, [
    { name: "id", type: "integer", isNullable: true }, // Should be not null
    { name: "email", type: "text", isNullable: true }
]));
