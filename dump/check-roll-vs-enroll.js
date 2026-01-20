import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: './.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import xlsx
let XLSX;
try {
  const xlsxModule = await import('xlsx');
  XLSX = xlsxModule.default;
} catch (e) {
  console.error('❌ Package "xlsx" not found. Please install it first:');
  console.error('npm install xlsx');
  process.exit(1);
}

async function checkRollVsEnroll() {
  const excelFilePath = path.join(__dirname, '..', 'data', 'Student data JU Jan2026.xlsx');
  
  console.log('🔍 CHECKING ROLL NO VS ENROLL NO');
  console.log('================================\n');
  
  try {
    // Read Excel file
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = data[0];
    const rows = data.slice(1);
    
    console.log(`📊 Analyzing ${rows.length} student records...\n`);
    
    let enrollNoCount = 0;
    let rollNoCount = 0;
    let bothCount = 0;
    let neitherCount = 0;
    const sampleRecords = [];
    
    for (let i = 0; i < Math.min(rows.length, 1000); i++) { // Check first 1000 for speed
      const row = rows[i];
      if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
        continue;
      }
      
      const enrollNo = row[16]; // EnrollNo (column 17)
      const rollNo = row[18];  // RollNo (column 19)
      const name = row[0];     // Name (column 1)
      
      const hasEnrollNo = enrollNo && enrollNo !== 'NULL' && enrollNo !== 'undefined' && enrollNo.toString().trim() !== '';
      const hasRollNo = rollNo && rollNo !== 'NULL' && rollNo !== 'undefined' && rollNo.toString().trim() !== '';
      
      if (hasEnrollNo && hasRollNo) {
        bothCount++;
      } else if (hasEnrollNo) {
        enrollNoCount++;
      } else if (hasRollNo) {
        rollNoCount++;
        if (sampleRecords.length < 5) {
          sampleRecords.push({ 
            row: i + 2, 
            name, 
            rollNo: rollNo.toString().trim(),
            enrollNo: null 
          });
        }
      } else {
        neitherCount++;
      }
    }
    
    console.log('📊 ANALYSIS RESULTS:');
    console.log('==================');
    console.log(`✅ Have EnrollNo only: ${enrollNoCount} records`);
    console.log(`✅ Have RollNo only: ${rollNoCount} records`);
    console.log(`✅ Have both: ${bothCount} records`);
    console.log(`❌ Have neither: ${neitherCount} records`);
    
    if (rollNoCount > 0) {
      console.log('\n📝 SAMPLE RECORDS WITH ROLL NO ONLY:');
      console.log('====================================');
      sampleRecords.forEach(record => {
        console.log(`Row ${record.row}: "${record.name}" → RollNo: "${record.rollNo}"`);
      });
      
      console.log('\n🔧 RECOMMENDATION:');
      console.log('==================');
      console.log('1. Use RollNo as registration_no for students without EnrollNo');
      console.log('2. Update auto-fetch to search both EnrollNo and RollNo');
      console.log('3. Ensure unique constraint allows both types');
    }
    
    // Check database for existing records
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: existingRecords } = await supabaseAdmin
      .from('student_data')
      .select('registration_no')
      .limit(10);
    
    console.log('\n🎯 SAMPLE EXISTING RECORDS IN DATABASE:');
    console.log('====================================');
    existingRecords?.forEach(record => {
      console.log(`Registration No: "${record.registration_no}"`);
    });
    
    return { enrollNoCount, rollNoCount, bothCount, neitherCount, sampleRecords };
    
  } catch (error) {
    console.error('💥 Analysis failed:', error.message);
    throw error;
  }
}

checkRollVsEnroll().catch(console.error);
