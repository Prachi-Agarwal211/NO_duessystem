
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function getColumnNames() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'config_schools'");
        console.log('Columns:', res.rows.map(r => r.column_name));
    } finally {
        client.release();
        await pool.end();
    }
}

getColumnNames();
