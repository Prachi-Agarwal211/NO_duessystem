const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function setupAdminSchema() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Admin Schema Setup...');

        // 1. Create system_settings table
        console.log('Checking system_settings table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL,
                description TEXT,
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                updated_by UUID
            );
        `);
        console.log('✅ system_settings table ready.');

        // 2. Add Scope columns to departments
        console.log('Adding scope columns to departments...');

        await client.query(`
            ALTER TABLE departments 
            ADD COLUMN IF NOT EXISTS allowed_school_ids JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS allowed_course_ids JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS allowed_branch_ids JSONB DEFAULT '[]'::jsonb;
        `);
        console.log('✅ departments scope columns added.');

        // 3. Seed initial settings if empty
        const { rows } = await client.query("SELECT * FROM system_settings WHERE key = 'allow_reapplication'");
        if (rows.length === 0) {
            await client.query(`
                INSERT INTO system_settings (key, value, description)
                VALUES 
                ('allow_reapplication', 'true'::jsonb, 'Allow students to re-apply after rejection'),
                ('academic_year', '"2025-26"'::jsonb, 'Current Academic Year'),
                ('maintenance_mode', 'false'::jsonb, 'Enable maintenance mode for student portal')
            `);
            console.log('✅ Seeded default system settings.');
        }

    } catch (err) {
        console.error('❌ Schema Setup Failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

setupAdminSchema();
