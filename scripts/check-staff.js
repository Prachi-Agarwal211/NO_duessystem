/**
 * Check Profiles and Departments Data
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkStaffConfig() {
    const client = await pool.connect();
    try {
        console.log('🕵️  Checking Staff Configuration...\n');

        // 1. Departments (Approval Steps)
        console.log('📋 Approval Departments:');
        const depts = await client.query('SELECT id, name, display_name FROM departments ORDER BY display_order');
        if (depts.rows.length === 0) console.log('   (No departments found)');
        depts.rows.forEach(d => {
            console.log(`   - [${d.name}] ${d.display_name} (ID: ${d.id})`);
        });

        // 2. Profiles Table Schema
        console.log('\n📋 Profiles Table Columns:');
        const profileSchema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles'
    `);

        const requiredCols = ['role', 'assigned_department_ids', 'school_ids', 'course_ids', 'branch_ids'];
        const existingCols = profileSchema.rows.map(r => r.column_name);

        requiredCols.forEach(col => {
            const exists = existingCols.includes(col);
            console.log(`   - ${col}: ${exists ? '✅' : '❌ MISSING'}`);
        });

        // 3. Sample Profile Data
        console.log('\n👤 Sample Staff Profiles:');
        const profiles = await client.query(`
      SELECT email, role, assigned_department_ids, school_ids, course_ids, branch_ids 
      FROM profiles 
      WHERE role != 'student' LIMIT 5
    `);
        if (profiles.rows.length === 0) console.log('   (No staff profiles found)');
        profiles.rows.forEach(p => {
            console.log(`   - ${p.email} (${p.role})`);
            console.log(`     Depts: ${JSON.stringify(p.assigned_department_ids)}`);
            console.log(`     Schools: ${JSON.stringify(p.school_ids)}`);
            console.log(`     Branches: ${JSON.stringify(p.branch_ids)}`);
        });

    } catch (err) {
        console.error('❌ Check Failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkStaffConfig();
