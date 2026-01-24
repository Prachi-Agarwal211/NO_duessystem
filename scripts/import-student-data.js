/**
 * Import Student Data Script
 * 
 * Imports student data from cleaned_student_data.csv into Supabase student_data table.
 * Uses batch inserts with upsert on registration_no.
 * 
 * Usage: node scripts/import-student-data.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const BATCH_SIZE = 500;
const CSV_PATH = path.join(__dirname, '..', 'processed_data', 'cleaned_student_data.csv');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Read and parse the CSV file
 */
function readCSV() {
  console.log(`📂 Reading CSV from: ${CSV_PATH}`);
  
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  console.log(`📋 Headers: ${headers.join(', ')}`);
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length !== headers.length) {
      console.warn(`⚠️ Skipping line ${i + 1}: column count mismatch (expected ${headers.length}, got ${values.length})`);
      continue;
    }
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    data.push(row);
  }
  
  console.log(`✅ Parsed ${data.length} records from CSV`);
  return data;
}

/**
 * Transform CSV row to database record
 */
function transformRecord(row) {
  return {
    registration_no: row.registration_no?.toUpperCase() || '',
    student_name: row.student_name || '',
    school_id: row.school_id || null,
    course_id: row.course_id || null,
    branch_id: row.branch_id || null,
    personal_email: row.email || null,
    contact_no: row.contact_no || null,
    parent_name: row.parent_name || null,
    admission_year: row.admission_year || null,
    passing_year: row.passing_year || null,
    // Store raw values for reference/matching
    school: row.raw_degree || null,  // We'll update these after fetching names
    course: row.raw_degree || null,
    branch: row.raw_branch || null,
    country_code: '+91',
    updated_at: new Date().toISOString(),
    updated_by: 'csv_import'
  };
}

/**
 * Fetch config names from database
 */
async function fetchConfigMaps() {
  console.log('🔄 Fetching configuration data...');
  
  // Fetch schools
  const { data: schools, error: schoolError } = await supabase
    .from('config_schools')
    .select('id, name');
  
  if (schoolError) {
    console.error('❌ Error fetching schools:', schoolError);
    return null;
  }
  
  // Fetch courses
  const { data: courses, error: courseError } = await supabase
    .from('config_courses')
    .select('id, name');
  
  if (courseError) {
    console.error('❌ Error fetching courses:', courseError);
    return null;
  }
  
  // Fetch branches
  const { data: branches, error: branchError } = await supabase
    .from('config_branches')
    .select('id, name');
  
  if (branchError) {
    console.error('❌ Error fetching branches:', branchError);
    return null;
  }
  
  // Create lookup maps
  const schoolMap = new Map(schools.map(s => [s.id, s.name]));
  const courseMap = new Map(courses.map(c => [c.id, c.name]));
  const branchMap = new Map(branches.map(b => [b.id, b.name]));
  
  console.log(`✅ Loaded ${schools.length} schools, ${courses.length} courses, ${branches.length} branches`);
  
  return { schoolMap, courseMap, branchMap };
}

/**
 * Insert records in batches
 */
async function insertBatch(records, configMaps) {
  const { schoolMap, courseMap, branchMap } = configMaps;
  
  // Enhance records with readable names
  const enhancedRecords = records.map(record => ({
    ...record,
    school: schoolMap.get(record.school_id) || record.school || '',
    course: courseMap.get(record.course_id) || record.course || '',
    branch: branchMap.get(record.branch_id) || record.branch || ''
  }));
  
  const { data, error } = await supabase
    .from('student_data')
    .upsert(enhancedRecords, { 
      onConflict: 'registration_no',
      ignoreDuplicates: false 
    });
  
  if (error) {
    console.error('❌ Error inserting batch:', error);
    return false;
  }
  
  return true;
}

/**
 * Main import function
 */
async function importData() {
  console.log('🚀 Starting student data import...\n');
  
  // 1. Read CSV
  const csvData = readCSV();
  
  if (csvData.length === 0) {
    console.error('❌ No data found in CSV');
    process.exit(1);
  }
  
  // 2. Fetch config maps for name resolution
  const configMaps = await fetchConfigMaps();
  
  if (!configMaps) {
    console.error('❌ Failed to fetch configuration data');
    process.exit(1);
  }
  
  // 3. Transform all records
  console.log('\n🔄 Transforming records...');
  const transformedRecords = csvData.map(transformRecord);
  
  // Filter out records without registration_no
  const validRecords = transformedRecords.filter(r => r.registration_no);
  console.log(`✅ ${validRecords.length} valid records to import`);
  
  // 4. Insert in batches
  console.log(`\n📤 Inserting in batches of ${BATCH_SIZE}...`);
  
  let successCount = 0;
  let failedBatches = 0;
  
  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    const batch = validRecords.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE);
    
    process.stdout.write(`\r   Batch ${batchNum}/${totalBatches} (${i + batch.length}/${validRecords.length} records)...`);
    
    const success = await insertBatch(batch, configMaps);
    
    if (success) {
      successCount += batch.length;
    } else {
      failedBatches++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n');
  console.log('═'.repeat(50));
  console.log('📊 IMPORT SUMMARY');
  console.log('═'.repeat(50));
  console.log(`   Total CSV records:    ${csvData.length}`);
  console.log(`   Valid records:        ${validRecords.length}`);
  console.log(`   Successfully imported: ${successCount}`);
  console.log(`   Failed batches:       ${failedBatches}`);
  console.log('═'.repeat(50));
  
  if (failedBatches === 0) {
    console.log('\n✅ Import completed successfully!');
  } else {
    console.log('\n⚠️ Import completed with some failures. Check logs above for details.');
  }
}

// Run the import
importData().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
