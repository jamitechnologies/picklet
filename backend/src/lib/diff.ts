import { DbtModel, DbtColumn } from './parser';

export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

export interface SchemaChange {
    modelName: string;
    columnName?: string;
    changeType: ChangeType;
    details?: string;
    oldValue?: any;
    newValue?: any;
}

export function diffSchemas(oldModels: DbtModel[], newModels: DbtModel[]): SchemaChange[] {
    const changes: SchemaChange[] = [];
    const oldModelMap = new Map(oldModels.map(m => [m.name, m]));
    const newModelMap = new Map(newModels.map(m => [m.name, m]));

    // Check for model changes
    for (const [name, oldModel] of oldModelMap) {
        if (!newModelMap.has(name)) {
            changes.push({ modelName: name, changeType: 'REMOVED', details: 'Model removed' });
        }
    }

    for (const [name, newModel] of newModelMap) {
        if (!oldModelMap.has(name)) {
            changes.push({ modelName: name, changeType: 'ADDED', details: 'Model added' });
        } else {
            // Model exists in both, check columns
            const oldModel = oldModelMap.get(name)!;
            const modelChanges = diffColumns(name, oldModel.columns, newModel.columns);
            changes.push(...modelChanges);
        }
    }

    return changes;
}

function diffColumns(modelName: string, oldCols: DbtColumn[], newCols: DbtColumn[]): SchemaChange[] {
    const changes: SchemaChange[] = [];
    const oldColMap = new Map(oldCols.map(c => [c.name, c]));
    const newColMap = new Map(newCols.map(c => [c.name, c]));

    // Check for removed columns
    for (const [name, oldCol] of oldColMap) {
        if (!newColMap.has(name)) {
            changes.push({
                modelName,
                columnName: name,
                changeType: 'REMOVED',
                details: 'Column removed',
                oldValue: oldCol
            });
        }
    }

    // Check for added and modified columns
    for (const [name, newCol] of newColMap) {
        if (!oldColMap.has(name)) {
            changes.push({
                modelName,
                columnName: name,
                changeType: 'ADDED',
                details: 'Column added',
                newValue: newCol
            });
        } else {
            const oldCol = oldColMap.get(name)!;
            // Check for modifications (e.g., description, type)
            // Note: In this simple POC we mainly check description. 
            // Real implementation woud checks types.
            if (oldCol.description !== newCol.description) {
                changes.push({
                    modelName,
                    columnName: name,
                    changeType: 'MODIFIED',
                    details: 'Description changed',
                    oldValue: oldCol.description,
                    newValue: newCol.description
                });
            }

            // We could add type checking here if we had type info populated
        }
    }

    return changes;
}
