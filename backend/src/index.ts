import 'dotenv/config';
import express from 'express';
import { pool } from './db'; // We will create this next

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            db_time: result.rows[0].now
        });
    } catch (err: any) {
        console.error('Health check failed', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
