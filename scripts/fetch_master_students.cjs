// Fetch master student table
const SUPABASE_URL = 'https://yjjcndurtjprbtvaikzs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqamNuZHVydGpwcmJ0dmFpa3pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA0NjUyMywiZXhwIjoyMDg0NjIyNTIzfQ.dEl7p4rlMz38ftav91485N0V8AY8fSbCx7gHqWD_6MY';

async function fetchMasterStudents() {
  console.log('Fetching master student data...\n');
  
  // Try student_data table
  console.log('1. Checking student_data table...');
  const studentDataResponse = await fetch(`${SUPABASE_URL}/rest/v1/student_data?select=*&limit=5`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  
  console.log(`Status: ${studentDataResponse.status}`);
  if (studentDataResponse.ok) {
    const data = await studentDataResponse.json();
    console.log('student_data sample:', JSON.stringify(data, null, 2));
  }
  
  // Try profiles with registration_no (enrollment_number equivalent)
  console.log('\n2. Fetching all profiles (staff + students)...');
  const profilesResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&limit=10`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  
  if (profilesResponse.ok) {
    const profiles = await profilesResponse.json();
    console.log('profiles sample:', JSON.stringify(profiles, null, 2));
  }
  
  // Get all students from no_dues_forms (these are the actual students who applied)
  console.log('\n3. Fetching students from no_dues_forms...');
  const formsResponse = await fetch(`${SUPABASE_URL}/rest/v1/no_dues_forms?select=*&limit=10`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  
  if (formsResponse.ok) {
    const forms = await formsResponse.json();
    console.log('no_dues_forms sample:', JSON.stringify(forms.slice(0, 3), null, 2));
  }
  
  // Get count of no_dues_forms
  console.log('\n4. Getting total student count from no_dues_forms...');
  const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/no_dues_forms?select=id`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  
  if (countResponse.ok) {
    const allForms = await countResponse.json();
    console.log(`Total students in no_dues_forms: ${allForms.length}`);
  }
  
  // Fetch all student data with pagination
  console.log('\n5. Fetching all student data (this may take a while)...');
  let allStudents = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const offset = page * pageSize;
    const url = `${SUPABASE_URL}/rest/v1/no_dues_forms?select=id,registration_no,student_name,school,course,branch,contact_no,personal_email,college_email,admission_year,passing_year,status,final_certificate_generated,certificate_url&offset=${offset}&limit=${pageSize}&order=registration_no.asc`;
    
    console.log(`Fetching page ${page + 1}...`);
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!response.ok) {
      console.log(`Error: ${response.status}`);
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
  
  console.log(`\nTotal students fetched: ${allStudents.length}`);
  
  // Save to file
  const fs = require('fs');
  fs.writeFileSync('all_master_students.json', JSON.stringify(allStudents, null, 2));
  console.log('All students saved to all_master_students.json');
  
  // Group by status
  console.log('\n=== Students by Status ===');
  const statusCount = {};
  allStudents.forEach(s => {
    const status = s.status || 'Unknown';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  console.log(JSON.stringify(statusCount, null, 2));
  
  // Group by course
  console.log('\n=== Students by Course ===');
  const courseCount = {};
  allStudents.forEach(s => {
    const course = s.course || 'Unknown';
    courseCount[course] = (courseCount[course] || 0) + 1;
  });
  console.log(JSON.stringify(courseCount, null, 2));
  
  // Show students with completed status
  console.log('\n=== Completed Students (First 20) ===');
  const completed = allStudents.filter(s => s.status === 'completed');
  console.log(`Total completed: ${completed.length}`);
  console.log(JSON.stringify(completed.slice(0, 20), null, 2));
  
  console.log('\nDone!');
}

fetchMasterStudents().catch(console.error);
