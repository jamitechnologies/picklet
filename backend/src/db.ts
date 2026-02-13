import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
    user: process.env.POSTGRES_USER || 'picket_user',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'picket_db',
    password: process.env.POSTGRES_PASSWORD || 'picket_password',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
