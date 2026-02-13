import { parse, Statement } from 'pgsql-ast-parser';

export interface ParsedMigrationChange {
    type: 'CREATE_TABLE' | 'ALTER_TABLE' | 'DROP_TABLE' | 'UNKNOWN';
    tableName?: string;
    details: string;
    severity: 'SAFE' | 'BREAKING' | 'MANUAL_REVIEW';
}

export function parseMigration(sql: string): ParsedMigrationChange[] {
    const changes: ParsedMigrationChange[] = [];
    try {
        const ast = parse(sql);

        for (const statement of ast) {
            if (statement.type === 'create table') {
                const tableName = statement.name.name;
                const columns = statement.columns
                    .filter(c => c.kind === 'column')
                    .map(c => (c as any).name.name)
                    .join(', ');

                changes.push({
                    type: 'CREATE_TABLE',
                    tableName,
                    details: `Created table ${tableName} with columns: ${columns}`,
                    severity: 'SAFE' // Creating a table is usually safe
                });
            } else if (statement.type === 'alter table') {
                const tableName = statement.table.name;

                if (Array.isArray(statement.changes)) {
                    for (const change of statement.changes) {
                        let action = 'Modified table';
                        let severity: ParsedMigrationChange['severity'] = 'MANUAL_REVIEW';

                        if (change.type === 'add column') {
                            const colName = change.column.name.name;
                            action = `Added column ${colName}`;

                            // Check for NOT NULL without DEFAULT
                            const isNotNull = change.column.constraints?.some(c => c.type === 'not null');
                            const hasDefault = change.column.constraints?.some(c => c.type === 'default');

                            if (isNotNull && !hasDefault) {
                                severity = 'BREAKING'; // Adding NOT NULL column without default is breaking
                            } else {
                                severity = 'SAFE';
                            }
                        } else if (change.type === 'alter column') {
                            action = `Modified column ${change.column.name}`;
                            // Simplifying assumption: type changes are breaking
                            severity = 'BREAKING';
                        } else if (change.type === 'drop column') {
                            action = `Dropped column ${change.column.name}`;
                            severity = 'BREAKING';
                        }

                        changes.push({
                            type: 'ALTER_TABLE',
                            tableName,
                            details: action,
                            severity
                        });
                    }
                }
            } else if (statement.type === 'drop table') {
                // You'll need to check the exact type structure for 'drop table' if supported by parser, 
                // or use the generic structure if it falls there.
                // Based on ast.d.ts: DropStatement type='drop table'
                const tableNames = (statement as any).names.map((n: any) => n.name).join(', ');
                changes.push({
                    type: 'DROP_TABLE',
                    tableName: tableNames, // Might be multiple
                    details: `Dropped table(s) ${tableNames}`,
                    severity: 'BREAKING'
                });
            } else {
                changes.push({
                    type: 'UNKNOWN',
                    details: `Unsupported statement type: ${statement.type}`,
                    severity: 'MANUAL_REVIEW'
                });
            }
        }
    } catch (e: any) {
        changes.push({
            type: 'UNKNOWN',
            details: `Failed to parse SQL: ${e.message}`,
            severity: 'MANUAL_REVIEW'
        });
    }
    return changes;
}
