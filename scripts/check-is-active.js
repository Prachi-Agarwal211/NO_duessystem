/**
 * Check is_active data types and values
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkIsActive() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT id, name, is_active, pg_typeof(is_active) as type FROM config_schools LIMIT 5");
        console.log('Sample data (config_schools):');
        res.rows.forEach(row => {
            console.log(`- ${row.name}: is_active=${row.is_active} (Type: ${row.type})`);
        });
    } finally {
        client.release();
        await pool.end();
    }
}

checkIsActive();
