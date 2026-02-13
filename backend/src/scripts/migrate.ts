import { pool } from '../db';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
    console.log('Running migrations...');
    const client = await pool.connect();
    try {
        const migrationsDir = path.join(__dirname, '../../database/migrations');
        const files = fs.readdirSync(migrationsDir).sort();

        for (const file of files) {
            if (file.endsWith('.sql')) {
                console.log(`Executing ${file}...`);
                const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                await client.query(content);
            }
        }
        console.log('Migrations complete.');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
