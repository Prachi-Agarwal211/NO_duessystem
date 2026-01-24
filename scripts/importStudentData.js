const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import Supabase admin client
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function parseCSV(filePath) {
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const lines = csvContent.split(/\r?\n/);
  
  // Parse header
  const headers = lines[0].split(',').map(header => header.replace(/^"|"$/g, ''));
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    // Handle quoted fields that might contain commas
    const row = parseCSVRow(lines[i]);
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] ? row[j].replace(/^"|"$/g, '') : '';
    }
    data.push(obj);
  }
  
  return data;
}

function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function mapCSVToDB(csvRow) {
  // Map CSV fields to database fields based on the actual student_data table structure
  // Only include fields that exist in the student_data table
  return {
    registration_no: csvRow.registration_no?.toUpperCase() || null,
    student_name: csvRow.student_name || null,
    parent_name: csvRow.parent_name || null,
    school: csvRow.school_id || null,  // Using UUID as school identifier since that's what's in the CSV
    course: csvRow.course_id || null,  // Using UUID as course identifier since that's what's in the CSV
    branch: csvRow.branch_id || null,  // Using UUID as branch identifier since that's what's in the CSV
    contact_no: csvRow.contact_no || null,
    personal_email: csvRow.email || null,
    college_email: csvRow.email || null, // Using same email for both personal and college
    admission_year: csvRow.admission_year ? parseInt(csvRow.admission_year) : null,
    passing_year: csvRow.passing_year ? parseInt(csvRow.passing_year) : null,
    // Set some default values
    updated_at: new Date().toISOString(),  // Only updated_at, no created_at in student_data table
    updated_by: 'bulk_import_script'
    // id and form_id are auto-generated fields, so we don't include them
  };
}

async function insertStudentData(studentData) {
  // First check if a record with this registration number already exists
  const { data: existingRecord, error: fetchError } = await supabase
    .from('student_data')
    .select('id')
    .eq('registration_no', studentData.registration_no)
    .single();

  if (existingRecord) {
    // Update existing record
    const { data, error } = await supabase
      .from('student_data')
      .update(studentData)
      .eq('registration_no', studentData.registration_no)
      .select();

    if (error) {
      console.error(`❌ Error updating student with registration number ${studentData.registration_no}:`, error.message);
      return { success: false, error };
    }
    console.log(`🔄 Updated student with registration number ${studentData.registration_no}`);
    return { success: true, data };
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('student_data')
      .insert([studentData])
      .select();

    if (error) {
      console.error(`❌ Error inserting student with registration number ${studentData.registration_no}:`, error.message);
      return { success: false, error };
    }
    console.log(`✅ Inserted student with registration number ${studentData.registration_no}`);
    return { success: true, data };
  }
}

async function importStudentData() {
  const csvFilePath = path.join(__dirname, '..', 'processed_data', 'cleaned_student_data.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found at path: ${csvFilePath}`);
    process.exit(1);
  }

  console.log('📊 Reading CSV file...');
  const csvData = await parseCSV(csvFilePath);
  
  console.log(`✅ Loaded ${csvData.length} student records from CSV`);
  
  let successCount = 0;
  let errorCount = 0;
  
  console.log('🔄 Starting import process...');
  
  for (let i = 0; i < csvData.length; i++) {
    const csvRow = csvData[i];
    const studentRecord = mapCSVToDB(csvRow);
    
    try {
      const result = await insertStudentData(studentRecord);
      
      if (result.success) {
        successCount++;
        if (successCount % 100 === 0) {
          console.log(`✅ Processed ${successCount}/${csvData.length} students...`);
        }
      } else {
        errorCount++;
      }
    } catch (err) {
      console.error(`❌ Unexpected error processing student with registration number ${studentRecord.registration_no}:`, err.message);
      errorCount++;
    }
  }
  
  console.log('\n🎉 Import process completed!');
  console.log(`✅ Successfully processed: ${successCount} students`);
  console.log(`❌ Errors occurred: ${errorCount} students`);
  
  if (errorCount > 0) {
    console.log('\n💡 Some records failed to insert/update. Check the errors above for details.');
    console.log('   This might be due to validation constraints, network issues, or other database errors.');
  }
}

// Run the import
if (require.main === module) {
  console.log('🚀 Starting student data import process...');
  importStudentData()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed with error:', error);
      process.exit(1);
    });
}

module.exports = { parseCSV, mapCSVToDB, importStudentData };