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

async function importFocusedExcelData() {
  const excelFilePath = path.join(__dirname, '..', 'data', 'Student data JU Jan2026.xlsx');
  
  console.log('🎯 FOCUSED EXCEL IMPORT FOR NO DUES FORM');
  console.log('=====================================\n');
  
  try {
    // Read Excel file
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = data[0];
    const rows = data.slice(1);
    
    console.log(`📊 Found ${rows.length} student records`);
    console.log(`📋 Excel columns: ${headers.join(', ')}\n`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
        continue; // Skip empty rows
      }
      
      try {
        // Extract data from Excel columns
        const enrollNo = cleanValue(row[16]); // EnrollNo (column 17)
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
        const admissionDate = cleanValue(row[11]); // AdmissionDate (column 12)
        const personalEmail = cleanValue(row[12]); // EmailId (column 13)
        const motherName = cleanValue(row[13]); // MotherName (column 14)
        const semester = cleanValue(row[17]);   // Semester (column 18)
        
        // Validate required fields
        if (!enrollNo || !name) {
          throw new Error(`Missing required fields: EnrollNo or Name`);
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
        
        // Use database mapping function
        const { data: result, error } = await supabaseAdmin
          .rpc('map_excel_to_student_data', {
            excel_registration_no: enrollNo,
            excel_student_name: fullName,
            excel_admission_year: admissionYear ? admissionYear.toString() : null,
            excel_passing_year: passingYear ? passingYear.toString() : null,
            excel_parent_name: fatherName || motherName || null,
            excel_school: school,
            excel_course: course,
            excel_branch: branch,
            excel_country_code: '+91',
            excel_contact_no: mobile,
            excel_personal_email: personalEmail,
            excel_college_email: collegeEmail,
            excel_alumni_profile_link: null, // Will be generated later
            excel_alumni_screenshot_url: null,
            excel_batch: admissionBatch,
            excel_section: semester,
            excel_semester: semester,
            excel_cgpa: null,
            excel_backlogs: '0',
            excel_roll_number: null,
            excel_enrollment_number: enrollNo,
            excel_date_of_birth: excelDateToDate(dob),
            excel_gender: null,
            excel_category: null,
            excel_blood_group: null,
            excel_address: null,
            excel_city: null,
            excel_state: null,
            excel_pin_code: null,
            excel_emergency_contact_name: null,
            excel_emergency_contact_no: null
          });
        
        if (error) {
          throw new Error(`Database error: ${error.message}`);
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
          enrollNo: cleanValue(row[16]) || 'Unknown',
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
    console.log(`✅ Successfully imported: ${successCount} records`);
    console.log(`❌ Failed imports: ${errorCount} records`);
    
    if (errors.length > 0) {
      console.log('\n📝 First 5 errors:');
      errors.slice(0, 5).forEach(err => {
        console.log(`  Row ${err.row} (${err.enrollNo}): ${err.error}`);
      });
    }
    
    // Verify import
    const { count } = await supabaseAdmin
      .from('student_data')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n🎯 Total records in student_data table: ${count}`);
    console.log('\n🚀 Auto-fetch is now ready to use!');
    console.log('📝 Students can use their EnrollNo to auto-fill the form.');
    
    return { successCount, errorCount, totalRecords: count };
    
  } catch (error) {
    console.error('💥 Import failed:', error.message);
    throw error;
  }
}

// Run the focused import
importFocusedExcelData().catch(console.error);
