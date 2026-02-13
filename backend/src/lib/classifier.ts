export type ChangeType =
    | 'FIELD_ADDED'
    | 'FIELD_REMOVED'
    | 'TYPE_CHANGED'
    | 'NULLABILITY_CHANGED'
    | 'DEFAULT_CHANGED'
    | 'CONSTRAINT_ADDED'
    | 'CONSTRAINT_REMOVED';

export type Severity = 'SAFE' | 'BREAKING' | 'RISKY';

export interface ColumnDefinition {
    name: string;
    type: string;
    isNullable: boolean;
    defaultValue?: string | null;
}

export interface ClassifiedChange {
    changeType: ChangeType;
    severity: Severity;
    columnName: string;
    details: string;
    oldValue?: any;
    newValue?: any;
}

/**
 * Classifies the change between two column definitions.
 * Returns null if no change.
 */
export function classifyColumnChange(oldCol: ColumnDefinition | undefined, newCol: ColumnDefinition | undefined): ClassifiedChange[] {
    const changes: ClassifiedChange[] = [];

    if (!oldCol && newCol) {
        // Field Added
        const isSafe = newCol.isNullable || !!newCol.defaultValue;
        changes.push({
            changeType: 'FIELD_ADDED',
            severity: isSafe ? 'SAFE' : 'BREAKING',
            columnName: newCol.name,
            details: isSafe ? 'Added optional/default column' : 'Added required column without default'
        });
        return changes;
    }

    if (oldCol && !newCol) {
        // Field Removed
        changes.push({
            changeType: 'FIELD_REMOVED',
            severity: 'BREAKING',
            columnName: oldCol.name,
            details: 'Column removed'
        });
        return changes;
    }

    if (oldCol && newCol) {
        // Modification
        if (oldCol.type !== newCol.type) {
            const compatibility = checkTypeCompatibility(oldCol.type, newCol.type);
            changes.push({
                changeType: 'TYPE_CHANGED',
                severity: compatibility,
                columnName: newCol.name,
                details: `Type changed from ${oldCol.type} to ${newCol.type} (${compatibility})`,
                oldValue: oldCol.type,
                newValue: newCol.type
            });
        }

        if (oldCol.isNullable !== newCol.isNullable) {
            // nullable -> not null (BREAKING)
            // not null -> nullable (SAFE)
            const isBreaking = oldCol.isNullable && !newCol.isNullable;
            changes.push({
                changeType: 'NULLABILITY_CHANGED',
                severity: isBreaking ? 'BREAKING' : 'SAFE',
                columnName: newCol.name,
                details: isBreaking ? 'Made column required' : 'Made column nullable',
                oldValue: oldCol.isNullable,
                newValue: newCol.isNullable
            });
        }

        // Check Default Value (Simplified: Changing default is usually safe for existing rows, 
        // but removing it makes future inserts strict if not null. Treating as SAFE for now mostly)
        if (oldCol.defaultValue !== newCol.defaultValue) {
            changes.push({
                changeType: 'DEFAULT_CHANGED',
                severity: 'SAFE',
                columnName: newCol.name,
                details: `Default value changed`,
                oldValue: oldCol.defaultValue,
                newValue: newCol.defaultValue
            });
        }
    }

    return changes;
}

export function checkTypeCompatibility(oldType: string, newType: string): Severity {
    const normalize = (t: string) => t.toLowerCase().split('(')[0].trim();
    const t1 = normalize(oldType);
    const t2 = normalize(newType);

    if (t1 === t2) return 'SAFE';

    // Integer widening
    const intTypes = ['smallint', 'integer', 'int', 'bigint'];
    if (intTypes.includes(t1) && intTypes.includes(t2)) {
        const idx1 = intTypes.indexOf(t1);
        const idx2 = intTypes.indexOf(t2);
        return idx2 >= idx1 ? 'SAFE' : 'BREAKING'; // Widening is safe, narrowing is breaking
    }

    // String changes
    const stringTypes = ['varchar', 'text', 'char', 'string'];
    if (stringTypes.includes(t1) && stringTypes.includes(t2)) {
        if (t1 === 'text' && t2 === 'varchar') return 'RISKY'; // Truncation risk
        if (t1 === 'varchar' && t2 === 'text') return 'SAFE';
        // For distinct varchar lengths, we'd need to parse the params. 
        // For now, assuming arbitrary string type changes are at least RISKY if not obviously SAFE.
        return 'RISKY';
    }

    // Casting to/from string (Postgres can cast most things to text)
    if (t2 === 'text' || t2 === 'varchar') return 'SAFE'; // Can usually cast anything to string
    if (t1 === 'text' || t1 === 'varchar') return 'RISKY'; // Casting string to number/date can fail

    // Timestamp
    if (t1.includes('timestamp') && t2.includes('timestamp')) return 'SAFE'; // Ignoring timezone nuances for MVP

    return 'BREAKING'; // Default to incompatible
}
