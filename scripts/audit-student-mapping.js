/**
 * Audit UUID mapping between Student Data and Config Tables
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function auditMapping() {
    const client = await pool.connect();
    try {
        const regNo = '21BCON532';
        console.log(`🧐 Auditing Mapping for ${regNo}...\n`);

        // 1. Get raw student data
        const studentRes = await client.query("SELECT * FROM student_data WHERE registration_no = $1", [regNo]);
        if (studentRes.rows.length === 0) {
            console.log('❌ Student not found');
            return;
        }
        const student = studentRes.rows[0];

        console.log('--- RAW STUDENT DATA ---');
        console.log(`School ID: ${student.school_id}`);
        console.log(`School Name: ${student.school}`);
        console.log(`Course ID: ${student.course_id}`);
        console.log(`Course Name: ${student.course}`);
        console.log(`Branch ID: ${student.branch_id}`);
        console.log(`Branch Name: ${student.branch}`);
        console.log('');

        // 2. Check config tables
        const schoolCheck = await client.query("SELECT id, name FROM config_schools WHERE id = $1", [student.school_id]);
        const courseCheck = await client.query("SELECT id, name FROM config_courses WHERE id = $1", [student.course_id]);
        const branchCheck = await client.query("SELECT id, name FROM config_branches WHERE id = $1", [student.branch_id]);

        console.log('--- CONFIG TABLE MATCHES ---');
        console.log(`School Match: ${schoolCheck.rows.length > 0 ? '✅ ' + schoolCheck.rows[0].name : '❌ NOT FOUND'}`);
        console.log(`Course Match: ${courseCheck.rows.length > 0 ? '✅ ' + courseCheck.rows[0].name : '❌ NOT FOUND'}`);
        console.log(`Branch Match: ${branchCheck.rows.length > 0 ? '✅ ' + branchCheck.rows[0].name : '❌ NOT FOUND'}`);
        console.log('');

        // 3. Name-based resolution check (how the frontend does it)
        const schoolByName = await client.query("SELECT id FROM config_schools WHERE name = $1", [student.school]);
        console.log(`--- NAME-BASED RESOLUTION ---`);
        console.log(`School by Name ("${student.school}"): ${schoolByName.rows.length > 0 ? '✅ ' + schoolByName.rows[0].id : '❌ NOT FOUND'}`);

    } finally {
        client.release();
        await pool.end();
    }
}

auditMapping();
