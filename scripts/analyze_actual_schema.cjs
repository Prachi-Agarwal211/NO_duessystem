// Analyze actual database schema and data
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
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

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeSchema() {
  try {
    console.log('🔍 ANALYZING ACTUAL DATABASE SCHEMA...\n');
    
    // 1. Get total records first
    console.log('📊 Getting record counts...');
    const { count: totalRecords, error: countError } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting records:', countError.message);
      return;
    } else {
      console.log(`📊 Total records: ${totalRecords}`);
    }
    
    // 2. Get status breakdown
    console.log('\n📈 Status breakdown:');
    const { data: statusData, error: statusError } = await supabase
      .from('no_dues_forms')
      .select('status');
    
    if (statusError) {
      console.error('❌ Error getting status data:', statusError.message);
    } else {
      const statusCounts = {};
      statusData.forEach(item => {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      });
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }
    
    // 3. Get sample records with all fields
    console.log('\n📄 Sample records:');
    const { data: samples, error: samplesError } = await supabase
      .from('no_dues_forms')
      .select('*')
      .limit(2);
    
    if (samplesError) {
      console.error('❌ Error getting samples:', samplesError.message);
    } else if (samples && samples.length > 0) {
      samples.forEach((record, index) => {
        console.log(`\n📝 Sample ${index + 1}:`);
        Object.entries(record).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
    } else {
      console.log('⚠️  No sample records found');
    }
    
    // 4. Check if our target students exist
    console.log('\n🔍 Checking for our target students...');
    const completedStudents = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../completed_students.json'), 'utf8')
    );
    
    const sampleEnrollments = completedStudents.slice(0, 5);
    console.log(`Checking first 5 enrollment numbers: ${sampleEnrollments.join(', ')}`);
    
    for (const enrollmentNo of sampleEnrollments) {
      const { data, error } = await supabase
        .from('no_dues_forms')
        .select('registration_no, student_name, status, final_certificate_generated')
        .eq('registration_no', enrollmentNo);
      
      if (error) {
        console.log(`❌ Error checking ${enrollmentNo}: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`✅ Found ${enrollmentNo}: ${data[0].student_name} (${data[0].status})`);
      } else {
        console.log(`❌ Not found: ${enrollmentNo}`);
      }
    }
    
    // 5. Check completed students
    console.log('\n🎓 Checking existing completed students...');
    const { data: completedData, error: completedError } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name, final_certificate_generated')
      .eq('status', 'completed')
      .limit(5);
    
    if (completedError) {
      console.error('❌ Error getting completed students:', completedError.message);
    } else if (completedData && completedData.length > 0) {
      console.log('✅ Existing completed students:');
      completedData.forEach(student => {
        console.log(`  ${student.registration_no}: ${student.student_name} (Cert: ${student.final_certificate_generated})`);
      });
    } else {
      console.log('⚠️  No completed students found');
    }
    
    console.log('\n🎯 ANALYSIS COMPLETE!');
    console.log('Now we can create proper data based on the actual schema');
    
  } catch (error) {
    console.error('💥 Analysis error:', error);
  }
}

analyzeSchema();
