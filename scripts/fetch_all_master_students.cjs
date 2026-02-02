// Fetch ALL students from master student_data table
const SUPABASE_URL = 'https://yjjcndurtjprbtvaikzs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqamNuZHVydGpwcmJ0dmFpa3pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA0NjUyMywiZXhwIjoyMDg0NjIyNTIzfQ.dEl7p4rlMz38ftav91485N0V8AY8fSbCx7gHqWD_6MY';

async function fetchAllMasterStudents() {
  console.log('Fetching ALL students from master student_data table...\n');
  
  try {
    let allStudents = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const offset = page * pageSize;
      const url = `${SUPABASE_URL}/rest/v1/student_data?select=*&offset=${offset}&limit=${pageSize}&order=registration_no.asc`;
      
      console.log(`Fetching page ${page + 1}...`);
      
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (!response.ok) {
        console.log(`Error: ${response.status} - ${response.statusText}`);
        const errorText = await response.text();
        console.log('Error details:', errorText);
        break;
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
    
    console.log(`\n========================================`);
    console.log(`TOTAL MASTER STUDENTS FETCHED: ${allStudents.length}`);
    console.log(`========================================\n`);
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync('MASTER_STUDENT_DATA.json', JSON.stringify(allStudents, null, 2));
    console.log('All students saved to MASTER_STUDENT_DATA.json');
    
    // Group by school
    console.log('\n=== Students by School ===');
    const schoolCount = {};
    allStudents.forEach(s => {
      const school = s.school || 'Unknown';
      schoolCount[school] = (schoolCount[school] || 0) + 1;
    });
    console.log(JSON.stringify(schoolCount, null, 2));
    
    // Group by course
    console.log('\n=== Students by Course ===');
    const courseCount = {};
    allStudents.forEach(s => {
      const course = s.course || 'Unknown';
      courseCount[course] = (courseCount[course] || 0) + 1;
    });
    console.log(JSON.stringify(courseCount, null, 2));
    
    // Group by branch
    console.log('\n=== Students by Branch (Top 20) ===');
    const branchCount = {};
    allStudents.forEach(s => {
      const branch = s.branch || 'Unknown';
      branchCount[branch] = (branchCount[branch] || 0) + 1;
    });
    // Sort by count
    const sortedBranches = Object.entries(branchCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    console.log(JSON.stringify(Object.fromEntries(sortedBranches), null, 2));
    
    // Group by admission year
    console.log('\n=== Students by Admission Year ===');
    const yearCount = {};
    allStudents.forEach(s => {
      const year = s.admission_year || 'Unknown';
      yearCount[year] = (yearCount[year] || 0) + 1;
    });
    console.log(JSON.stringify(yearCount, null, 2));
    
    // Show sample students
    console.log('\n=== Sample Students (First 10) ===');
    console.log(JSON.stringify(allStudents.slice(0, 10).map(s => ({
      registration_no: s.registration_no,
      student_name: s.student_name,
      school: s.school,
      course: s.course,
      branch: s.branch,
      admission_year: s.admission_year
    })), null, 2));
    
    console.log('\nDone!');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

fetchAllMasterStudents().catch(console.error);
