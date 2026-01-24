/**
 * Fix Config Tables - Add Missing Columns
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixConfigTables() {
    const client = await pool.connect();
    try {
        console.log('🛠️ Adding missing "display_order" columns...\n');

        const tables = ['config_schools', 'config_courses', 'config_branches', 'config_country_codes'];

        for (const table of tables) {
            console.log(`Checking ${table}...`);

            // Check if column exists
            const checkRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'display_order'
      `, [table]);

            if (checkRes.rows.length === 0) {
                console.log(`- Adding display_order to ${table}`);
                await client.query(`ALTER TABLE ${table} ADD COLUMN display_order INTEGER DEFAULT 0`);
            } else {
                console.log(`- Column already exists in ${table}`);
            }
        }

        console.log('\n✅ Database fix applied.');

    } catch (err) {
        console.error('❌ Fix Failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixConfigTables();
