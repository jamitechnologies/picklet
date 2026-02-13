import { classifyColumnChange, ColumnDefinition } from './classifier';

describe('Classifier', () => {
    describe('classifyColumnChange', () => {
        it('should classify ADD_COLUMN (nullable) as SAFE', () => {
            const newCol: ColumnDefinition = {
                name: 'new_col',
                type: 'varchar',
                isNullable: true
            };
            const result = classifyColumnChange(undefined, newCol);
            expect(result).toHaveLength(1);
            expect(result[0].changeType).toBe('FIELD_ADDED');
            expect(result[0].severity).toBe('SAFE');
        });

        it('should classify ADD_COLUMN (not null, no default) as BREAKING', () => {
            const newCol: ColumnDefinition = {
                name: 'new_col',
                type: 'varchar',
                isNullable: false
            };
            const result = classifyColumnChange(undefined, newCol);
            expect(result).toHaveLength(1);
            expect(result[0].changeType).toBe('FIELD_ADDED');
            expect(result[0].severity).toBe('BREAKING');
        });

        it('should classify DROP_COLUMN as BREAKING', () => {
            const oldCol: ColumnDefinition = {
                name: 'old_col',
                type: 'varchar',
                isNullable: true
            };
            const result = classifyColumnChange(oldCol, undefined);
            expect(result).toHaveLength(1);
            expect(result[0].changeType).toBe('FIELD_REMOVED');
            expect(result[0].severity).toBe('BREAKING');
        });

        it('should classify TYPE_CHANGED (int -> bigint) as SAFE', () => {
            const oldCol: ColumnDefinition = { name: 'id', type: 'int', isNullable: false };
            const newCol: ColumnDefinition = { name: 'id', type: 'bigint', isNullable: false };

            const result = classifyColumnChange(oldCol, newCol);
            expect(result).toHaveLength(1);
            expect(result[0].changeType).toBe('TYPE_CHANGED');
            expect(result[0].severity).toBe('SAFE');
        });

        it('should classify TYPE_CHANGED (bigint -> int) as BREAKING', () => {
            const oldCol: ColumnDefinition = { name: 'id', type: 'bigint', isNullable: false };
            const newCol: ColumnDefinition = { name: 'id', type: 'int', isNullable: false };

            const result = classifyColumnChange(oldCol, newCol);
            expect(result).toHaveLength(1);
            expect(result[0].changeType).toBe('TYPE_CHANGED');
            expect(result[0].severity).toBe('BREAKING');
        });
    });
});
