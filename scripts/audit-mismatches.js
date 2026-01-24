/**
 * Audit UUID Mismatches
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function auditMismatches() {
    const client = await pool.connect();
    try {
        console.log('🕵️ Analyzing UUID Drift...\n');

        // 1. Check School Mismatches
        console.log('--- SCHOOLS ---');
        const sch = await client.query(`
        SELECT DISTINCT s.school, s.school_id as student_sid, cs.id as config_sid 
        FROM student_data s 
        LEFT JOIN config_schools cs ON s.school = cs.name 
        WHERE s.school IS NOT NULL 
        LIMIT 5
    `);
        sch.rows.forEach(r => {
            const match = r.student_sid === r.config_sid;
            console.log(`[${match ? '✅' : '❌'}] "${r.school}"`);
            console.log(`      Student SID: ${r.student_sid}`);
            console.log(`      Config  SID: ${r.config_sid}`);
        });

        // 2. Check Course Mismatches
        console.log('\n--- COURSES ---');
        const crs = await client.query(`
        SELECT DISTINCT s.course, s.course_id as student_cid, cc.id as config_cid 
        FROM student_data s 
        LEFT JOIN config_courses cc ON s.course = cc.name 
        WHERE s.course IS NOT NULL 
        LIMIT 5
    `);
        crs.rows.forEach(r => {
            const match = r.student_cid === r.config_cid;
            console.log(`[${match ? '✅' : '❌'}] "${r.course}"`);
            console.log(`      Student CID: ${r.student_cid}`);
            console.log(`      Config  CID: ${r.config_cid}`);
        });

        // 3. Check Branch Mismatches
        console.log('\n--- BRANCHES ---');
        const brn = await client.query(`
        SELECT DISTINCT s.branch, s.branch_id as student_bid, cb.id as config_bid 
        FROM student_data s 
        LEFT JOIN config_branches cb ON s.branch = cb.name 
        WHERE s.branch IS NOT NULL 
        LIMIT 5
    `);
        brn.rows.forEach(r => {
            const match = r.student_bid === r.config_bid;
            console.log(`[${match ? '✅' : '❌'}] "${r.branch}"`);
            console.log(`      Student BID: ${r.student_bid}`);
            console.log(`      Config  BID: ${r.config_bid}`);
        });

    } finally {
        client.release();
        await pool.end();
    }
}

auditMismatches();
