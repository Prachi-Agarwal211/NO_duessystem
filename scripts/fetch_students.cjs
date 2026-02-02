const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Prachi%40200314@db.yjjcndurtjprbtvaikzs.supabase.co:5432/postgres'
});

async function getStudents() {
  console.log('Connecting to database...');
  
  try {
    await client.connect();
    console.log('Connected successfully!');
    
    // Get all profiles
    const res = await client.query('SELECT id, enrollment_number, full_name, email, branch, course, department, is_active FROM profiles ORDER BY enrollment_number');
    console.log('Total students:', res.rowCount);
    
    if (res.rowCount > 0) {
      console.log('Sample data (first 10):');
      console.log(JSON.stringify(res.rows.slice(0, 10), null, 2));
      
      // Save to file
      const fs = require('fs');
      fs.writeFileSync('all_students_from_db.json', JSON.stringify(res.rows, null, 2));
      console.log('All students saved to all_students_from_db.json');
      
      // Get count by department
      console.log('\n=== Students by Department ===');
      const deptCount = {};
      res.rows.forEach(s => {
        const dept = s.department || 'Unknown';
        deptCount[dept] = (deptCount[dept] || 0) + 1;
      });
      console.log(JSON.stringify(deptCount, null, 2));
    }
    
    await client.end();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

getStudents();
