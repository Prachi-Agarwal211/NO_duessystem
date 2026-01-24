
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function applySchema() {
    const client = await pool.connect();
    try {
        console.log('🚀 Applying DB Schema...');
        const sql = fs.readFileSync(SCHEMA_PATH, 'utf-8');

        // Split by semicolons to run statements individually if needed, 
        // or run as one block if supported (Postgres usually supports it)
        await client.query(sql);

        console.log('✅ Schema applied successfully!');
    } catch (err) {
        console.error('❌ Schema application failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

applySchema();
