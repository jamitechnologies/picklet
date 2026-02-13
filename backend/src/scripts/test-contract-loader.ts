import * as path from 'path';
import { ContractLoader } from '../lib/contract-loader';

async function main() {
    const rootDir = path.resolve(__dirname, '../../../examples');
    console.log(`Loading contracts from: ${rootDir}`);

    const loader = new ContractLoader(rootDir);
    // Explicitly pointing to our contracts dir relative to examples for testing
    // Config: searchPath = 'contracts' (which resolves to examples/contracts)
    const loaded = loader.loadContracts({ contractPaths: ['contracts'] });

    console.log(`Loaded ${loaded.length} contracts.`);
    loaded.forEach(c => {
        console.log(`  - ${c.contract.contract.resource.name} (${c.contract.contract.resource.type})`);
    });

    console.log('\n--- Testing Matcher ---');

    const testCases = [
        { type: 'dbt_model', name: 'stg_users', expect: 'stg_users' },
        { type: 'postgres_table', name: 'public.raw_events', expect: 'public.raw_events' },
        { type: 'kafka_topic', name: 'user_signups', expect: 'user_signups' },
        { type: 'dbt_model', name: 'non_existent', expect: undefined },
        { type: 'dbt_model', name: 'stg_orders', expect: 'stg_*' }
    ];

    for (const test of testCases) {
        const match = loader.findContract(test.type, test.name);
        const matchName = match ? match.contract.resource.name : 'undefined';
        const icon = matchName === (test.expect || 'undefined') ? '✅' : '❌';

        console.log(`${icon} Match ${test.type}:${test.name} -> ${matchName}`);
    }

    // Test Wildcard functionality mock
    // We don't have a wildcard contract file yet, let's create a virtual one to test logic if we can,
    // or just rely on the existing ones for now. 
    // To truly test wildcard, we should create a temporary contract file.

    // Skip wildcard test for now unless we add a wildcard contract.
}

main();
