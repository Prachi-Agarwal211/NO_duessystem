import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
function loadEnv() {
  const envFile = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  }
}

// Initialize Supabase
function initSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key);
}

async function analyzeDatabase() {
  loadEnv();
  const supabase = initSupabase();
  
  console.log('🔍 Analyzing database structure...');
  
  // 1. Get sample of current database records
  const { data: sampleRecords, error: sampleError } = await supabase
    .from('no_dues_forms')
    .select('registration_no, student_name, status, final_certificate_generated')
    .limit(10);
  
  if (sampleError) {
    console.error('❌ Error fetching sample:', sampleError);
    return;
  }
  
  console.log('\n📋 Sample records from database:');
  sampleRecords.forEach(record => {
    console.log(`  ${record.registration_no} - ${record.student_name} - Status: ${record.status}`);
  });
  
  // 2. Count total records
  const { count: totalRecords, error: countError } = await supabase
    .from('no_dues_forms')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Error counting records:', countError);
  } else {
    console.log(`\n📊 Total records in database: ${totalRecords}`);
  }
  
  // 3. Count by status
  const { data: statusCounts, error: statusError } = await supabase
    .from('no_dues_forms')
    .select('status')
    .then(({ data }) => {
      const counts = {};
      data.forEach(item => {
        counts[item.status] = (counts[item.status] || 0) + 1;
      });
      return counts;
    });
  
  console.log('\n📈 Status breakdown:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  // 4. Check for some specific enrollment numbers from our completed list
  const completedStudents = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../completed_students.json'), 
    'utf8'
  ));
  
  console.log('\n🔍 Checking 5 random completed students in database:');
  const randomSample = completedStudents.slice(0, 5);
  
  for (const enrollmentNo of randomSample) {
    const { data, error } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name, status')
      .eq('registration_no', enrollmentNo);
    
    if (error) {
      console.log(`❌ ${enrollmentNo}: Error - ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`✅ ${enrollmentNo}: Found - ${data[0].student_name} (${data[0].status})`);
    } else {
      console.log(`❌ ${enrollmentNo}: Not found`);
    }
  }
  
  // 5. Check if there are any records with similar patterns
  console.log('\n🔍 Searching for similar enrollment patterns...');
  
  // Try with different case variations
  const testEnrollment = completedStudents[0];
  const variations = [
    testEnrollment,
    testEnrollment.toLowerCase(),
    testEnrollment.toUpperCase(),
    testEnrollment.replace(/([A-Z]+)/, (match) => match.toLowerCase())
  ];
  
  for (const variation of variations) {
    const { data, error } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name')
      .eq('registration_no', variation)
      .limit(1);
    
    if (data && data.length > 0) {
      console.log(`✅ Found with variation "${variation}": ${data[0].student_name}`);
      break;
    }
  }
}

analyzeDatabase().catch(console.error);
