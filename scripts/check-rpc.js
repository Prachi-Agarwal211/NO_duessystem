require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkRpcDefinitions() {
    const query = `
    SELECT routine_name, routine_definition 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('get_form_statistics', 'get_department_workload');
  `;

    try {
        const res = await pool.query(query);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkRpcDefinitions();
