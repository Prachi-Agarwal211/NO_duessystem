const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findLibraryInfo() {
    try {
        console.log('--- Departments ---');
        const deptRes = await pool.query("SELECT * FROM departments WHERE name = 'library' OR email LIKE '%library%'");
        console.log(JSON.stringify(deptRes.rows, null, 2));

        console.log('\n--- Profiles ---');
        const profileRes = await pool.query("SELECT email, role, department_name FROM profiles WHERE email LIKE '%library%' OR department_name = 'library'");
        console.log(JSON.stringify(profileRes.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findLibraryInfo();
