import { classifyColumnChange, ColumnDefinition } from '../lib/classifier';

function runTest(name: string, oldCol: ColumnDefinition | undefined, newCol: ColumnDefinition | undefined) {
    console.log(`Test: ${name}`);
    const changes = classifyColumnChange(oldCol, newCol);
    if (changes.length === 0) {
        console.log('  No changes detected.');
    } else {
        changes.forEach(c => {
            const icon = c.severity === 'BREAKING' ? '❌' :
                c.severity === 'RISKY' ? '⚠️' : '✅';
            console.log(`  ${icon} [${c.severity}] ${c.changeType}: ${c.details}`);
        });
    }
    console.log('');
}

console.log('--- Classifier Test Suite ---\n');

// 1. Safe Add
runTest('Add Nullable Column', undefined, { name: 'new_col', type: 'integer', isNullable: true });

// 2. Safe Add with Default
runTest('Add Column with Default', undefined, { name: 'status', type: 'text', isNullable: false, defaultValue: "'active'" });

// 3. Breaking Add
runTest('Add Required Column (No Default)', undefined, { name: 'required_col', type: 'integer', isNullable: false });

// 4. Breaking Drop
runTest('Drop Column', { name: 'old_col', type: 'integer', isNullable: true }, undefined);

// 5. Safe Type Change (Widening)
runTest('Int -> Bigint',
    { name: 'count', type: 'integer', isNullable: true },
    { name: 'count', type: 'bigint', isNullable: true }
);

// 6. Breaking Type Change (Narrowing)
runTest('Bigint -> Int',
    { name: 'count', type: 'bigint', isNullable: true },
    { name: 'count', type: 'integer', isNullable: true }
);

// 7. Safe Type Change (String)
runTest('Varchar -> Text',
    { name: 'desc', type: 'varchar', isNullable: true },
    { name: 'desc', type: 'text', isNullable: true }
);

// 8. Risky Type Change
runTest('Text -> Varchar',
    { name: 'desc', type: 'text', isNullable: true },
    { name: 'desc', type: 'varchar', isNullable: true }
);

// 9. Breaking Nullability Change
runTest('Nullable -> Not Null',
    { name: 'email', type: 'text', isNullable: true },
    { name: 'email', type: 'text', isNullable: false }
);

// 10. Safe Nullability Change
runTest('Not Null -> Nullable',
    { name: 'email', type: 'text', isNullable: false },
    { name: 'email', type: 'text', isNullable: true }
);
