/**
 * Direct Database Consistency Check
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkConsistency() {
    const client = await pool.connect();
    try {
        const regNo = '21BCON532';
        console.log(`🔍 Checking consistency for ${regNo}\n`);

        // 1. Get Student
        const sRes = await client.query("SELECT student_name, school_id, school, course_id, course, branch_id, branch FROM student_data WHERE registration_no = $1", [regNo]);
        if (sRes.rows.length === 0) { console.log('Student not found'); return; }
        const s = sRes.rows[0];

        console.log('--- STUDENT RECORD ---');
        console.log(`Name:   ${s.student_name}`);
        console.log(`School: ${s.school} (ID: ${s.school_id})`);
        console.log(`Course: ${s.course} (ID: ${s.course_id})`);
        console.log(`Branch: ${s.branch} (ID: ${s.branch_id})`);
        console.log('');

        // 2. Check Schools
        const schRes = await client.query("SELECT id, name FROM config_schools WHERE id = $1 OR name = $2", [s.school_id, s.school]);
        console.log('--- SCHOOL MATCHES ---');
        schRes.rows.forEach(r => console.log(`Config: ${r.name} (ID: ${r.id})`));
        if (schRes.rows.length === 0) console.log('❌ NO MATCH FOUND IN CONFIG_SCHOOLS');

        // 3. Check Courses
        const cRes = await client.query("SELECT id, name FROM config_courses WHERE id = $1 OR name = $2", [s.course_id, s.course]);
        console.log('\n--- COURSE MATCHES ---');
        cRes.rows.forEach(r => console.log(`Config: ${r.name} (ID: ${r.id})`));
        if (cRes.rows.length === 0) console.log('❌ NO MATCH FOUND IN CONFIG_COURSES');

        // 4. Check Branches
        const bRes = await client.query("SELECT id, name FROM config_branches WHERE id = $1 OR name = $2", [s.branch_id, s.branch]);
        console.log('\n--- BRANCH MATCHES ---');
        bRes.rows.forEach(r => console.log(`Config: ${r.name} (ID: ${r.id})`));
        if (bRes.rows.length === 0) console.log('❌ NO MATCH FOUND IN CONFIG_BRANCHES');

    } finally {
        client.release();
        await pool.end();
    }
}

checkConsistency();
