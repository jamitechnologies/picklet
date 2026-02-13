import { parse, Statement } from 'pgsql-ast-parser';

export interface MigrationChange {
    type: 'CREATE_TABLE' | 'ALTER_TABLE' | 'UNKNOWN';
    tableName?: string;
    details: string;
}

export function parseMigration(sql: string): MigrationChange[] {
    const changes: MigrationChange[] = [];
    try {
        const ast = parse(sql);

        for (const statement of ast) {
            if (statement.type === 'create table') {
                const tableName = statement.name.name;
                // Filter for actual column definitions (skip 'like table' etc for now)
                const columns = statement.columns
                    .filter(c => c.kind === 'column')
                    .map(c => (c as any).name.name) // name is on CreateColumnDef
                    .join(', ');

                changes.push({
                    type: 'CREATE_TABLE',
                    tableName,
                    details: `Created table ${tableName} with columns: ${columns}`
                });
            } else if (statement.type === 'alter table') {
                const tableName = statement.table.name; // It is 'table', not 'name' on AlterTableStatement

                // Iterate over all changes in the alter statement
                if (Array.isArray(statement.changes)) {
                    for (const change of statement.changes) {
                        let action = 'Modified table';

                        if (change.type === 'add column') {
                            action = `Added column ${change.column.name.name}`;
                        } else if (change.type === 'alter column') {
                            action = `Modified column ${change.column.name}`;
                        } else if (change.type === 'drop column') {
                            action = `Dropped column ${change.column.name}`;
                        }

                        changes.push({
                            type: 'ALTER_TABLE',
                            tableName,
                            details: action
                        });
                    }
                }
            } else {
                changes.push({
                    type: 'UNKNOWN',
                    details: `Unsupported statement type: ${statement.type}`
                });
            }
        }
    } catch (e: any) {
        changes.push({
            type: 'UNKNOWN',
            details: `Failed to parse SQL: ${e.message}`
        });
    }
    return changes;
}
