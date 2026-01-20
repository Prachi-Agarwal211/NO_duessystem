import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: './.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// You'll need to install these packages first:
// npm install xlsx
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

// Column mapping - adjust these to match your Excel columns
const COLUMN_MAPPING = {
  // Excel column name → Database field name
  'Registration No': 'registration_no',
  'Reg No': 'registration_no',
  'Roll No': 'registration_no',
  'Enrollment No': 'registration_no',
  'Student Name': 'student_name',
  'Name': 'student_name',
  'Full Name': 'student_name',
  'Admission Year': 'admission_year',
  'Admission Year': 'admission_year',
  'Passing Year': 'passing_year',
  'Passing Year': 'passing_year',
  'Graduation Year': 'passing_year',
  'Parent Name': 'parent_name',
  'Father Name': 'parent_name',
  'Mother Name': 'parent_name',
  'Guardian Name': 'parent_name',
  'School': 'school',
  'Department': 'school',
  'Faculty': 'school',
  'College': 'school',
  'Course': 'course',
  'Program': 'course',
  'Degree': 'course',
  'Stream': 'course',
  'Branch': 'branch',
  'Specialization': 'branch',
  'Major': 'branch',
  'Discipline': 'branch',
  'Concentration': 'branch',
  'Country Code': 'country_code',
  'Contact No': 'contact_no',
  'Phone': 'contact_no',
  'Mobile': 'contact_no',
  'Telephone': 'contact_no',
  'Contact Number': 'contact_no',
  'Phone No': 'contact_no',
  'Personal Email': 'personal_email',
  'Email': 'personal_email',
  'Email ID': 'personal_email',
  'Personal Mail': 'personal_email',
  'College Email': 'college_email',
  'Official Email': 'college_email',
  'Institution Email': 'college_email',
  'College Mail': 'college_email',
  'Alumni Profile Link': 'alumni_profile_link',
  'Alumni Link': 'alumni_profile_link',
  'Alumni URL': 'alumni_profile_link',
  'Batch': 'batch',
  'Class': 'batch',
  'Section': 'batch',
  'Group': 'batch',
  'Semester': 'semester',
  'Sem': 'semester',
  'Term': 'semester',
  'CGPA': 'cgpa',
  'GPA': 'cgpa',
  'Grade': 'cgpa',
  'Percentage': 'cgpa',
  'Marks': 'cgpa',
  'Backlogs': 'backlogs',
  'Roll Number': 'roll_number',
  'Enrollment Number': 'enrollment_number',
  'Date of Birth': 'date_of_birth',
  'DOB': 'date_of_birth',
  'Birth Date': 'date_of_birth',
  'Gender': 'gender',
  'Sex': 'gender',
  'Category': 'category',
  'Caste': 'category',
  'Community': 'category',
  'Reservation': 'category',
  'Blood Group': 'blood_group',
  'Blood Type': 'blood_group',
  'Blood': 'blood_group',
  'Address': 'address',
  'Residential Address': 'address',
  'Home Address': 'address',
  'Permanent Address': 'address',
  'City': 'city',
  'Town': 'city',
  'Location': 'city',
  'State': 'state',
  'Region': 'state',
  'Province': 'state',
  'Pin Code': 'pin_code',
  'Postal Code': 'pin_code',
  'Zipcode': 'pin_code',
  'Zip': 'pin_code',
  'Emergency Contact Name': 'emergency_contact_name',
  'Emergency Contact': 'emergency_contact_name',
  'Emergency Name': 'emergency_contact_name',
  'Emergency Contact No': 'emergency_contact_no',
  'Emergency Phone': 'emergency_contact_no',
  'Emergency Mobile': 'emergency_contact_no'
};

function normalizeColumnName(columnName) {
  if (!columnName) return '';
  const normalized = columnName.toString().trim();
  return COLUMN_MAPPING[normalized] || normalized.toLowerCase().replace(/[^a-z_]/g, '_');
}

function cleanValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const cleaned = value.toString().trim();
    return cleaned === '' ? null : cleaned;
  }
  return value;
}

async function importExcelToDatabase(excelFilePath) {
  console.log('📊 Starting Excel import...');
  
  try {
    // Read Excel file
    console.log(`📖 Reading Excel file: ${excelFilePath}`);
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length < 2) {
      throw new Error('Excel file is empty or has no data');
    }
    
    // Get headers (first row)
    const headers = data[0];
    console.log(`📋 Found ${headers.length} columns:`, headers);
    
    // Map headers to database fields
    const fieldMapping = {};
    headers.forEach((header, index) => {
      const fieldName = normalizeColumnName(header);
      fieldMapping[index] = fieldName;
      console.log(`  ${header} → ${fieldName}`);
    });
    
    // Process data rows
    const rows = data.slice(1); // Skip header row
    console.log(`📈 Processing ${rows.length} student records...`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
        continue; // Skip empty rows
      }
      
      try {
        // Map row data to database fields
        const studentData = {};
        headers.forEach((header, colIndex) => {
          const fieldName = fieldMapping[colIndex];
          if (fieldName) {
            studentData[fieldName] = cleanValue(row[colIndex]);
          }
        });
        
        // Validate required fields
        if (!studentData.registration_no && !studentData.enrollno) {
          // Use EnrollNo as registration_no if registration_no is missing
          studentData.registration_no = studentData.enrollno;
        }
        
        if (!studentData.registration_no || !studentData.student_name) {
          throw new Error(`Missing required fields: registration_no or student_name`);
        }
        
        // Use the database mapping function
        const { data: result, error } = await supabaseAdmin
          .rpc('map_excel_to_student_data', {
            excel_registration_no: studentData.registration_no,
            excel_student_name: studentData.student_name,
            excel_admission_year: studentData.admission_year || null,
            excel_passing_year: studentData.passing_year || studentData.graduation_year || null,
            excel_parent_name: studentData.parent_name || studentData.father_name || studentData.mother_name || null,
            excel_school: studentData.school || studentData.department || studentData.faculty || null,
            excel_course: studentData.course || studentData.program || studentData.degree || null,
            excel_branch: studentData.branch || studentData.specialization || studentData.major || null,
            excel_country_code: studentData.country_code || '+91',
            excel_contact_no: studentData.contact_no || studentData.phone || studentData.mobile || null,
            excel_personal_email: studentData.personal_email || studentData.email || null,
            excel_college_email: studentData.college_email || studentData.official_email || null,
            excel_alumni_profile_link: studentData.alumni_profile_link || studentData.alumni_link || null,
            excel_alumni_screenshot_url: studentData.alumni_screenshot_url || null,
            excel_batch: studentData.batch || studentData.class || studentData.section || null,
            excel_section: studentData.section || null,
            excel_semester: studentData.semester || studentData.sem || studentData.term || null,
            excel_cgpa: studentData.cgpa || studentData.gpa || studentData.grade || studentData.percentage || null,
            excel_backlogs: studentData.backlogs || '0',
            excel_roll_number: studentData.roll_number || null,
            excel_enrollment_number: studentData.enrollment_number || null,
            excel_date_of_birth: studentData.date_of_birth || studentData.dob || studentData.birth_date || null,
            excel_gender: studentData.gender || studentData.sex || null,
            excel_category: studentData.category || studentData.caste || studentData.community || null,
            excel_blood_group: studentData.blood_group || studentData.blood_type || studentData.blood || null,
            excel_address: studentData.address || studentData.residential_address || studentData.home_address || null,
            excel_city: studentData.city || studentData.town || studentData.location || null,
            excel_state: studentData.state || studentData.region || studentData.province || null,
            excel_pin_code: studentData.pin_code || studentData.postal_code || studentData.zipcode || studentData.zip || null,
            excel_emergency_contact_name: studentData.emergency_contact_name || studentData.emergency_contact || studentData.emergency_name || null,
            excel_emergency_contact_no: studentData.emergency_contact_no || studentData.emergency_phone || studentData.emergency_mobile || null
          });
        
        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }
        
        successCount++;
        
        // Progress indicator
        if ((i + 1) % 100 === 0 || i === rows.length - 1) {
          console.log(`✅ Processed ${i + 1}/${rows.length} records (${successCount} successful, ${errorCount} errors)`);
        }
        
      } catch (error) {
        errorCount++;
        errors.push({
          row: i + 2, // +2 because Excel rows are 1-indexed and we skipped header
          registration_no: studentData.registration_no || 'Unknown',
          error: error.message
        });
        
        // Log first 10 errors
        if (errors.length <= 10) {
          console.log(`❌ Row ${i + 2}: ${error.message}`);
        }
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`✅ Successfully imported: ${successCount} records`);
    console.log(`❌ Failed imports: ${errorCount} records`);
    
    if (errors.length > 0) {
      console.log('\n📝 First 10 errors:');
      errors.slice(0, 10).forEach(err => {
        console.log(`  Row ${err.row} (${err.registration_no}): ${err.error}`);
      });
      
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
    }
    
    // Verify import
    const { count } = await supabaseAdmin
      .from('student_data')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n🎯 Total records in student_data table: ${count}`);
    
    return { successCount, errorCount, totalRecords: count };
    
  } catch (error) {
    console.error('💥 Import failed:', error.message);
    throw error;
  }
}


// Run the import
async function main() {
  const excelFilePath = path.join(__dirname, '..', 'data', 'Student data JU Jan2026.xlsx');
  
  console.log('🚀 Starting automated Excel import...');
  console.log(`📁 Excel file: ${excelFilePath}`);
  
  // Check if file exists
  if (!fs.existsSync(excelFilePath)) {
    console.error('❌ Excel file not found:', excelFilePath);
    console.error('Please make sure your Excel file is in the data folder.');
    process.exit(1);
  }
  
  try {
    const result = await importExcelToDatabase(excelFilePath);
    console.log('\n🎉 Import completed successfully!');
    console.log(`📊 Results: ${result.successCount} imported, ${result.errorCount} failed`);
    console.log(`🎯 Total in database: ${result.totalRecords}`);
    
  } catch (error) {
    console.error('\n💥 Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
main().catch(console.error);
