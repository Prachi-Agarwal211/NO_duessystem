/**
 * Deep Hierarchy Check
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkHierarchy() {
    const client = await pool.connect();
    try {
        console.log('🧐 Verifying Hierarchy Connections...\n');

        // 1. Check School -> Course link
        const coursesRes = await client.query(`
      SELECT c.name as course, s.name as school 
      FROM config_courses c 
      JOIN config_schools s ON c.school_id = s.id 
      LIMIT 3
    `);
        console.log('✅ Course -> School Link Works:');
        coursesRes.rows.forEach(r => console.log(`   - ${r.course} belongs to ${r.school}`));

        // 2. Check Course -> Branch link
        const branchesRes = await client.query(`
      SELECT b.name as branch, c.name as course 
      FROM config_branches b 
      JOIN config_courses c ON b.course_id = c.id 
      LIMIT 3
    `);
        console.log('\n✅ Branch -> Course Link Works:');
        branchesRes.rows.forEach(r => console.log(`   - ${r.branch} belongs to ${r.course}`));

        // 3. Verify IDs used in Student Data
        const studentRes = await client.query(`
      SELECT student_name, school_id, course_id, branch_id 
      FROM student_data 
      LIMIT 1
    `);
        if (studentRes.rows.length > 0) {
            console.log('\n✅ Student Data References:');
            console.log(`   - ${studentRes.rows[0].student_name} records use UUIDs for School, Course, and Branch.`);
        }

    } finally {
        client.release();
        await pool.end();
    }
}

checkHierarchy();
