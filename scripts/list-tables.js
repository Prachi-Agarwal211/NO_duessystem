
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listConfigTables() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
        console.log('Tables:', res.rows.map(r => r.tablename));
    } finally {
        client.release();
        await pool.end();
    }
}

listConfigTables();
