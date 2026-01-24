/**
 * Targeted Mapping Audit for 21BCON532
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function auditTargeted() {
    const client = await pool.connect();
    try {
        const regNo = '21BCON532';
        console.log(`🎯 Targeted Audit: ${regNo}\n`);

        // 1. Get Student raw
        const s = (await client.query("SELECT * FROM student_data WHERE registration_no = $1", [regNo])).rows[0];
        if (!s) { console.log('Student not found'); return; }

        console.log('--- STUDENT RECORD ---');
        console.log(`School: [${s.school_id}] ${s.school}`);
        console.log(`Course: [${s.course_id}] ${s.course}`);
        console.log(`Branch: [${s.branch_id}] ${s.branch}`);

        // 2. Check if these IDs exist in config
        const sch = await client.query("SELECT id, name FROM config_schools WHERE id = $1", [s.school_id]);
        const crs = await client.query("SELECT id, name FROM config_courses WHERE id = $1", [s.course_id]);
        const brn = await client.query("SELECT id, name FROM config_branches WHERE id = $1", [s.branch_id]);

        console.log('\n--- ID EXISTENCE IN CONFIG ---');
        console.log(`School ID Exists: ${sch.rows.length > 0 ? '✅ (' + sch.rows[0].name + ')' : '❌ MISSING'}`);
        console.log(`Course ID Exists: ${crs.rows.length > 0 ? '✅ (' + crs.rows[0].name + ')' : '❌ MISSING'}`);
        console.log(`Branch ID Exists: ${brn.rows.length > 0 ? '✅ (' + brn.rows[0].name + ')' : '❌ MISSING'}`);

        // 3. Search config by NAME to find the REAL current IDs
        const schReal = await client.query("SELECT id FROM config_schools WHERE name = $1", [s.school]);
        const crsReal = await client.query("SELECT id FROM config_courses WHERE name = $1", [s.course]);
        const brnReal = await client.query("SELECT id FROM config_branches WHERE name = $1", [s.branch]);

        console.log('\n--- REAL IDs (BY NAME MATCH) ---');
        console.log(`Real School ID: ${schReal.rows[0]?.id || 'NONE'}`);
        console.log(`Real Course ID: ${crsReal.rows[0]?.id || 'NONE'}`);
        console.log(`Real Branch ID: ${brnReal.rows[0]?.id || 'NONE'}`);

    } finally {
        client.release();
        await pool.end();
    }
}

auditTargeted();
