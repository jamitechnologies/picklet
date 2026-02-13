import { parseMigration } from './sql-parser';

describe('Parsers', () => {
    describe('parseMigration', () => {
        it('should identify CREATE TABLE', () => {
            const sql = 'CREATE TABLE users (id SERIAL PRIMARY KEY);';
            const result = parseMigration(sql);
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('CREATE_TABLE');
            expect((result[0] as any).tableName).toBe('users');
        });

        it('should identify ADD COLUMN', () => {
            const sql = 'ALTER TABLE users ADD COLUMN email VARCHAR(255);';
            const result = parseMigration(sql);
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('ALTER_TABLE');
            expect(result[0].details).toContain('Added column email');
        });

        it('should identify DROP COLUMN', () => {
            const sql = 'ALTER TABLE users DROP COLUMN email;';
            const result = parseMigration(sql);
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('ALTER_TABLE');
            expect(result[0].details).toContain('Dropped column email');
        });
    });
});
