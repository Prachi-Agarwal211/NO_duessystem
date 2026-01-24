/**
 * Deep Database Audit Script
 * Checks Indexes, RLS, and Constraints
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function auditDB() {
    const client = await pool.connect();
    try {
        console.log('🕵️  Starting Deep Database Audit...\n');

        // 1. Check Indexes
        console.log('📊 Checking Indexes:');
        const indexQuery = `
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('student_data', 'no_dues_forms', 'no_dues_status')
      ORDER BY tablename, indexname;
    `;
        const indices = await client.query(indexQuery);
        if (indices.rows.length === 0) {
            console.log('   ⚠️  No indexes found!');
        } else {
            indices.rows.forEach(idx => {
                console.log(`   ✅ ${idx.tablename}: ${idx.indexname}`);
                // console.log(`      ${idx.indexdef}`);
            });
        }

        // 2. Check RLS
        console.log('\n🔒 Checking RLS Policies:');
        const rlsQuery = `
      SELECT tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('student_data', 'no_dues_forms', 'no_dues_status');
    `;
        const policies = await client.query(rlsQuery);
        if (policies.rows.length === 0) {
            console.log('   ⚠️  No RLS policies found!');
        } else {
            policies.rows.forEach(pol => {
                console.log(`   🛡️  ${pol.tablename}: ${pol.policyname} (${pol.cmd})`);
            });
        }

        // 3. Check Row Counts
        console.log('\n📈 Row Counts:');
        const counts = await client.query(`
      SELECT 
        (SELECT count(*) FROM student_data) as students,
        (SELECT count(*) FROM no_dues_forms) as forms,
        (SELECT count(*) FROM config_schools) as schools
    `);
        console.log(`   Students: ${counts.rows[0].students}`);
        console.log(`   Forms:    ${counts.rows[0].forms}`);
        console.log(`   Schools:  ${counts.rows[0].schools}`);

        console.log('\n✅ Audit Complete.');

    } catch (err) {
        console.error('❌ Audit Failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

auditDB();
