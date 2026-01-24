/**
 * Audit Specific Branch ID
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function auditBranch() {
    const client = await pool.connect();
    try {
        const studentBranchId = '4677cb3a-8340-49e7-94ca-68e56d454607';
        console.log(`🕵️ Investigating Branch ID: ${studentBranchId}\n`);

        const res = await client.query(`
      SELECT b.id, b.name, b.course_id, c.name as course_name, c.school_id, s.name as school_name
      FROM config_branches b
      JOIN config_courses c ON b.course_id = c.id
      JOIN config_schools s ON c.school_id = s.id
      WHERE b.id = $1
    `, [studentBranchId]);

        if (res.rows.length > 0) {
            console.log('✅ Branch found in hierarchy:');
            console.log(JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('❌ Branch ID NOT linked to any valid course/school!');

            const orphan = await client.query("SELECT * FROM config_branches WHERE id = $1", [studentBranchId]);
            if (orphan.rows.length > 0) {
                console.log('⚠️ It exists in config_branches but course_id is likely invalid:', orphan.rows[0].course_id);
            }
        }

    } finally {
        client.release();
        await pool.end();
    }
}

auditBranch();
