/**
 * Check RLS on Config Tables
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkRLS() {
    const client = await pool.connect();
    try {
        console.log('🛡️  Checking RLS Policies for Config Tables...\n');

        const res = await client.query(`
      SELECT 
        tablename, 
        rowsecurity,
        (SELECT count(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
      FROM pg_tables t
      WHERE schemaname = 'public' 
      AND tablename LIKE 'config_%'
    `);

        for (const row of res.rows) {
            console.log(`Table: ${row.tablename}`);
            console.log(`- RLS Enabled: ${row.rowsecurity}`);
            console.log(`- Policies: ${row.policy_count}`);

            const policies = await client.query(`
        SELECT policyname, roles, cmd, qual 
        FROM pg_policies 
        WHERE tablename = $1
      `, [row.tablename]);

            policies.rows.forEach(p => {
                console.log(`  └─ Policy: ${p.policyname} (${p.cmd} for ${p.roles})`);
            });
            console.log('');
        }

    } finally {
        client.release();
        await pool.end();
    }
}

checkRLS();
