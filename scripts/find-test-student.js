
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findStudent() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT * FROM student_data WHERE registration_no = '21BCON532'");
        console.log(JSON.stringify(res.rows, null, 2));
    } finally {
        client.release();
        await pool.end();
    }
}

findStudent();
