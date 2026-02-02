// PROPER schema analysis - what columns REALLY exist
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

async function properSchemaAnalysis() {
  try {
    console.log('🔍 PROPER SCHEMA ANALYSIS - WHAT COLUMNS REALLY EXIST...\n');
    
    // 1. Get the actual record and list ALL columns
    console.log('📋 GETTING ACTUAL COLUMNS FROM EXISTING RECORD:');
    const { data: existingRecord, error: recordError } = await supabase
      .from('no_dues_forms')
      .select('*')
      .limit(1);
    
    if (recordError) {
      console.error('❌ Error getting record:', recordError.message);
      return;
    }
    
    if (existingRecord && existingRecord.length > 0) {
      console.log('ACTUAL COLUMNS FOUND:');
      const columns = Object.keys(existingRecord[0]);
      columns.forEach((column, index) => {
        const value = existingRecord[0][column];
        const type = typeof value;
        const displayValue = value === null ? 'NULL' : 
                           value === '' ? 'EMPTY_STRING' :
                           typeof value === 'object' ? JSON.stringify(value) : 
                           value;
        console.log(`  ${index + 1}. ${column}: ${displayValue} (${type})`);
      });
      
      console.log(`\n📊 TOTAL COLUMNS: ${columns.length}`);
    }
    
    // 2. Try to insert a test record to see what's required
    console.log('\n🧪 TESTING COLUMN REQUIREMENTS:');
    
    // Try minimal insert first
    const testId = 'test-' + Date.now();
    const minimalData = {
      id: testId,
      registration_no: 'TEST001',
      student_name: 'Test Student'
    };
    
    console.log('Testing minimal insert with:', Object.keys(minimalData));
    
    const { data: testData, error: testError } = await supabase
      .from('no_dues_forms')
      .insert(minimalData)
      .select();
    
    if (testError) {
      console.log('❌ Minimal insert failed:', testError.message);
      console.log('This shows what columns are REQUIRED');
      
      // Try with more columns
      console.log('\n🔄 Trying with more columns...');
      
      const fullTestData = {
        id: testId,
        registration_no: 'TEST001',
        student_name: 'Test Student',
        parent_name: 'Test Parent',
        school_id: null,
        school: '',
        course_id: null,
        course: '',
        branch_id: null,
        branch: '',
        country_code: '+91',
        contact_no: '9876543210',
        personal_email: 'test@test.com',
        college_email: 'test@jecrcu.edu.in',
        admission_year: '2022',
        passing_year: '2025',
        alumni_profile_link: null,
        status: 'completed',
        rejection_reason: null,
        is_reapplication: false,
        reapplication_count: 0,
        last_reapplied_at: null,
        student_reply_message: null,
        final_certificate_generated: true,
        certificate_url: 'test.pdf',
        certificate_generated_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        rejection_context: null,
        unread_count: 0,
        department_unread_counts: {},
        blockchain_hash: 'test-hash',
        blockchain_tx: 'test-tx',
        blockchain_block: '1234567890',
        blockchain_timestamp: new Date().toISOString(),
        blockchain_verified: true
      };
      
      console.log('Testing full insert with:', Object.keys(fullTestData));
      
      const { data: fullTestDataResult, error: fullTestError } = await supabase
        .from('no_dues_forms')
        .insert(fullTestData)
        .select();
      
      if (fullTestError) {
        console.log('❌ Full insert also failed:', fullTestError.message);
      } else {
        console.log('✅ Full insert worked!');
        
        // Clean up test record
        await supabase
          .from('no_dues_forms')
          .delete()
          .eq('id', testId);
        
        console.log('🧹 Test record cleaned up');
      }
    } else {
      console.log('✅ Minimal insert worked!');
      
      // Clean up test record
      await supabase
        .from('no_dues_forms')
        .delete()
        .eq('id', testId);
      
      console.log('🧹 Test record cleaned up');
    }
    
    // 3. Get column information from the database directly
    console.log('\n🔍 TRYING TO GET COLUMN INFO DIRECTLY:');
    
    // Try PostgreSQL system tables
    try {
      const { data: columns, error: columnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'no_dues_forms' });
      
      if (!columnsError && columns) {
        console.log('Columns from RPC:');
        columns.forEach(col => {
          console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
      }
    } catch (e) {
      console.log('⚠️  Could not get column info via RPC');
    }
    
    // 4. Final summary
    console.log('\n🎯 PROPER SCHEMA ANALYSIS COMPLETE!');
    console.log('Now we know EXACTLY what columns exist and what\'s required');
    
  } catch (error) {
    console.error('💥 Schema analysis error:', error);
  }
}

properSchemaAnalysis();
