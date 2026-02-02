// Using native fetch (Node 18+)
const fs = require('fs');

const SUPABASE_URL = 'https://yjjcndurtjprbtvaikzs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqamNuZHVydGpwcmJ0dmFpa3pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA0NjUyMywiZXhwIjoyMDg0NjIyNTIzfQ.dEl7p4rlMz38ftav91485N0V8AY8fSbCx7gHqWD_6MY';

async function fetchAllStudents() {
  console.log('Fetching all students from Supabase profiles table...');
  
  try {
    let allStudents = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const offset = page * pageSize;
      const url = `${SUPABASE_URL}/rest/v1/profiles?select=*&order=enrollment_number.asc&limit=${pageSize}&offset=${offset}`;
      
      console.log(`Fetching page ${page + 1}...`);
      
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const students = await response.json();
      
      if (students.length === 0) {
        hasMore = false;
      } else {
        allStudents = allStudents.concat(students);
        console.log(`Fetched ${allStudents.length} students so far...`);
        
        if (students.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }
    
    console.log(`\nTotal students fetched: ${allStudents.length}`);
    console.log('Sample data (first 10):');
    console.log(JSON.stringify(allStudents.slice(0, 10), null, 2));
    
    // Save to file
    fs.writeFileSync('all_students_from_db.json', JSON.stringify(allStudents, null, 2));
    console.log('\nAll students saved to all_students_from_db.json');
    
    // Get count by department
    console.log('\n=== Students by Department ===');
    const deptCount = {};
    allStudents.forEach(s => {
      const dept = s.department || 'Unknown';
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    });
    console.log(JSON.stringify(deptCount, null, 2));
    
    // Get count by course
    console.log('\n=== Students by Course ===');
    const courseCount = {};
    allStudents.forEach(s => {
      const course = s.course || 'Unknown';
      courseCount[course] = (courseCount[course] || 0) + 1;
    });
    console.log(JSON.stringify(courseCount, null, 2));
    
    console.log('\nDone!');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

fetchAllStudents();
