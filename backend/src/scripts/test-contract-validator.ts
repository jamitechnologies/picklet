import * as path from 'path';
import { validateContract } from '../lib/contract-validator';

async function main() {
    const contractsDir = path.resolve(__dirname, '../../../examples/contracts');
    const files = ['dbt-model.yml', 'postgres-table.yml', 'kafka-topic.yml', 'invalid.yml'];

    console.log('--- Contract Validator Test Suite ---\n');

    for (const file of files) {
        const filePath = path.join(contractsDir, file);
        console.log(`Validating: ${file}`);
        const result = validateContract(filePath);

        if (result.valid) {
            console.log('  ✅ Valid');
        } else {
            console.log('  ❌ Invalid');
            result.errors?.forEach(e => console.log(`     - ${e}`));
        }
        console.log('');
    }

    // Test Invalid Contract
    console.log('Validating: invalid-contract (mock)');
    const invalidMockPath = path.resolve(__dirname, '../../../examples/contracts/invalid.yml');
    // We expect this file not to exist or we mock it, but for now let's just create a dummy invalid one in memory or on disk?
    // Let's rely on the real files first.
}

main();
