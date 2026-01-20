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

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// School mapping based on Degree
const SCHOOL_MAPPING = {
  'Bachelor of Science': 'School of Sciences',
  'Bachelor of Science (Hons.)': 'School of Sciences',
  'Bachelor of Technology': 'School of Engineering & Technology',
  'B.Tech': 'School of Engineering & Technology',
  'Bachelor of Computer Applications': 'School of Computer Applications',
  'BCA': 'School of Computer Applications',
  'Bachelor of Business Administration': 'Jaipur School of Business',
  'BBA': 'Jaipur School of Business',
  'Master of Business Administration': 'Jaipur School of Business',
  'MBA': 'Jaipur School of Business',
  'Bachelor of Arts': 'School of Humanities',
  'BA': 'School of Humanities',
  'Bachelor of Commerce': 'School of Commerce',
  'B.Com': 'School of Commerce',
  'Ph.D.': 'Ph.D. (Doctoral Programme)',
  'PhD': 'Ph.D. (Doctoral Programme)',
  'Diploma': 'School of Engineering & Technology',
  'Executive Programs': 'Jaipur School of Business'
};

// Clean and validate values
function cleanValue(value) {
  if (value === null || value === undefined || value === 'NULL') return null;
  if (typeof value === 'string') {
    const cleaned = value.toString().trim();
    return cleaned === '' ? null : cleaned;
  }
  return value;
}

// Extract year from AdmissionBatch (e.g., "2016-17" → 2016)
function extractYearFromBatch(batch) {
  if (!batch) return null;
  const match = batch.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

// Convert Excel date number to actual date
function excelDateToDate(excelDate) {
  if (!excelDate || excelDate === 'NULL') return null;
  if (isNaN(excelDate)) return null;
  
  // Excel dates are days since 1900-01-01
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Generate college email from personal email
function generateCollegeEmail(personalEmail) {
  if (!personalEmail) return null;
  
  // Extract username from personal email
  const match = personalEmail.match(/^([^@]+)@/);
  if (!match) return null;
  
  const username = match[1].toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${username}@jecrcu.edu.in`;
}

async function completeExcelImport() {
  const excelFilePath = path.join(__dirname, '..', 'data', 'Student data JU Jan2026.xlsx');
  
  console.log('🎯 COMPLETE EXCEL IMPORT (ENROLL + ROLL)');
  console.log('========================================\n');
  
  try {
    // Read Excel file
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = data[0];
    const rows = data.slice(1);
    
    console.log(`📊 Found ${rows.length} student records\n`);
    
    let successCount = 0;
    let errorCount = 0;
    let rollNoOnlyCount = 0;
    let enrollNoOnlyCount = 0;
    let bothCount = 0;
    const errors = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
        continue; // Skip empty rows
      }
      
      try {
        // Extract data from Excel columns
        const enrollNo = cleanValue(row[16]); // EnrollNo (column 17)
        const rollNo = cleanValue(row[18]);   // RollNo (column 19)
        const name = cleanValue(row[0]);      // Name (column 1)
        const branch = cleanValue(row[1]);     // Branch (column 2)
        const degree = cleanValue(row[2]);    // Degree (column 3)
        const year = cleanValue(row[4]);       // Year (column 5)
        const admissionBatch = cleanValue(row[5]); // AdmissionBatch (column 6)
        const firstName = cleanValue(row[6]);   // FirstName (column 7)
        const fatherName = cleanValue(row[7]); // FatherName (column 8)
        const lastName = cleanValue(row[8]);    // LastName (column 9)
        const dob = cleanValue(row[9]);        // DOB (column 10)
        const mobile = cleanValue(row[10]);     // StudentMobile (column 11)
        const personalEmail = cleanValue(row[12]); // EmailId (column 13)
        const motherName = cleanValue(row[13]); // MotherName (column 14)
        const semester = cleanValue(row[17]);   // Semester (column 18)
        
        // Determine registration number (use EnrollNo first, then RollNo)
        let registrationNo = enrollNo;
        let registrationType = 'enroll';
        
        if (!enrollNo || enrollNo === 'undefined' || enrollNo.toString().trim() === '') {
          if (rollNo && rollNo !== 'undefined' && rollNo.toString().trim() !== '') {
            registrationNo = rollNo;
            registrationType = 'roll';
            rollNoOnlyCount++;
          } else {
            throw new Error(`Missing both EnrollNo and RollNo`);
          }
        } else {
          enrollNoOnlyCount++;
        }
        
        // Validate required fields
        if (!registrationNo || !name) {
          throw new Error(`Missing required fields: registration number or name`);
        }
        
        // Build full name
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || name;
        
        // Extract admission year
        const admissionYear = extractYearFromBatch(admissionBatch) || extractYearFromBatch(year);
        
        // Estimate passing year (typically 4 years after admission)
        const passingYear = admissionYear ? admissionYear + 4 : null;
        
        // Map degree to school
        const school = SCHOOL_MAPPING[degree] || 'School of Engineering & Technology';
        
        // Map degree to course (use degree as course)
        const course = degree;
        
        // Generate college email
        const collegeEmail = generateCollegeEmail(personalEmail);
        
        // Check if already exists
        const { data: existingRecord } = await supabaseAdmin
          .from('student_data')
          .select('id')
          .eq('registration_no', registrationNo)
          .single();
        
        if (existingRecord) {
          // Update existing record
          const { data: result, error } = await supabaseAdmin
            .from('student_data')
            .update({
              student_name: fullName,
              admission_year: admissionYear,
              passing_year: passingYear,
              parent_name: fatherName || motherName,
              school: school,
              course: course,
              branch: branch,
              country_code: '+91',
              contact_no: mobile,
              personal_email: personalEmail,
              college_email: collegeEmail,
              batch: admissionBatch,
              section: semester,
              semester: semester ? parseInt(semester.replace(/[^0-9]/g, '')) : null,
              date_of_birth: excelDateToDate(dob),
              data_source: 'excel',
              status: 'active'
            })
            .eq('registration_no', registrationNo)
            .select('id')
            .single();
          
          if (error) throw new Error(`Update error: ${error.message}`);
        } else {
          // Insert new record
          const { data: result, error } = await supabaseAdmin
            .from('student_data')
            .insert({
              registration_no: registrationNo,
              student_name: fullName,
              admission_year: admissionYear,
              passing_year: passingYear,
              parent_name: fatherName || motherName,
              school: school,
              course: course,
              branch: branch,
              country_code: '+91',
              contact_no: mobile,
              personal_email: personalEmail,
              college_email: collegeEmail,
              alumni_profile_link: null,
              alumni_screenshot_url: null,
              batch: admissionBatch,
              section: semester,
              semester: semester ? parseInt(semester.replace(/[^0-9]/g, '')) : null,
              cgpa: null,
              backlogs: 0,
              roll_number: rollNo,
              enrollment_number: enrollNo,
              date_of_birth: excelDateToDate(dob),
              gender: null,
              category: null,
              blood_group: null,
              address: null,
              city: null,
              state: null,
              pin_code: null,
              emergency_contact_name: null,
              emergency_contact_no: null,
              data_source: 'excel',
              status: 'active'
            })
            .select('id')
            .single();
          
          if (error) throw new Error(`Insert error: ${error.message}`);
        }
        
        successCount++;
        
        // Progress indicator
        if ((i + 1) % 500 === 0 || i === rows.length - 1) {
          console.log(`✅ Processed ${i + 1}/${rows.length} records (${successCount} successful, ${errorCount} errors)`);
        }
        
      } catch (error) {
        errorCount++;
        errors.push({
          row: i + 2,
          enrollNo: cleanValue(row[16]) || 'None',
          rollNo: cleanValue(row[18]) || 'None',
          error: error.message
        });
        
        // Log first 5 errors
        if (errors.length <= 5) {
          console.log(`❌ Row ${i + 2}: ${error.message}`);
        }
      }
    }
    
    console.log('\n📊 IMPORT SUMMARY:');
    console.log('==================');
    console.log(`✅ Successfully processed: ${successCount} records`);
    console.log(`❌ Failed imports: ${errorCount} records`);
    console.log(`📋 EnrollNo only: ${enrollNoOnlyCount} records`);
    console.log(`📋 RollNo only: ${rollNoOnlyCount} records`);
    
    if (errors.length > 0) {
      console.log('\n📝 First 5 errors:');
      errors.slice(0, 5).forEach(err => {
        console.log(`  Row ${err.row} (Enroll: ${err.enrollNo}, Roll: ${err.rollNo}): ${err.error}`);
      });
    }
    
    // Verify import
    const { count } = await supabaseAdmin
      .from('student_data')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n🎯 Total records in student_data table: ${count}`);
    console.log('\n🚀 Auto-fetch is now ready to use!');
    console.log('📝 Students can use either EnrollNo or RollNo to auto-fill the form.');
    
    return { successCount, errorCount, totalRecords: count };
    
  } catch (error) {
    console.error('💥 Import failed:', error.message);
    throw error;
  }
}

// Run the complete import
completeExcelImport().catch(console.error);
