/**
 * Verify specific ID status
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifySpecifics() {
    const client = await pool.connect();
    try {
        const sId = '3e60ced0-41d3-4bd1-b105-6a38d22acb3c';
        const cId = '4070b71a-6a9a-4436-9452-f9ed8e97e1f1';
        const bId = '4677cb3a-8340-49e7-94ca-68e56d454607';

        console.log('🧐 Verifying Active Status for Student 21BCON532 IDs...\n');

        const s = await client.query("SELECT id, name, is_active FROM config_schools WHERE id = $1", [sId]);
        const c = await client.query("SELECT id, name, is_active FROM config_courses WHERE id = $1", [cId]);
        const b = await client.query("SELECT id, name, is_active FROM config_branches WHERE id = $1", [bId]);

        console.log(`School: ${s.rows[0]?.name} | Active: ${s.rows[0]?.is_active}`);
        console.log(`Course: ${c.rows[0]?.name} | Active: ${c.rows[0]?.is_active}`);
        console.log(`Branch: ${b.rows[0]?.name} | Active: ${b.rows[0]?.is_active}`);

        // Check course-to-school link
        const link1 = await client.query("SELECT id FROM config_courses WHERE id = $1 AND school_id = $2", [cId, sId]);
        console.log(`Course-to-School Link: ${link1.rows.length > 0 ? '✅' : '❌'}`);

        // Check branch-to-course link
        const link2 = await client.query("SELECT id FROM config_branches WHERE id = $1 AND course_id = $2", [bId, cId]);
        console.log(`Branch-to-Course Link: ${link2.rows.length > 0 ? '✅' : '❌'}`);

    } finally {
        client.release();
        await pool.end();
    }
}

verifySpecifics();
