import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: fs.existsSync('./.env.local') ? './.env.local' : './.env' });

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

    // Process data rows in batches for high performance
    const rows = data.slice(1);
    const totalRows = rows.length;
    const batchSize = 1000;
    let successCount = 0;
    let errorCount = 0;

    console.log(`📈 Processing ${totalRows} records in batches of ${batchSize}...`);

    for (let i = 0; i < totalRows; i += batchSize) {
      const batchRows = rows.slice(i, i + batchSize);
      const batchData = [];

      for (const row of batchRows) {
        if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
          continue;
        }

        const studentData = {};
        headers.forEach((header, colIndex) => {
          const fieldName = fieldMapping[colIndex];
          if (fieldName) {
            studentData[fieldName] = cleanValue(row[colIndex]);
          }
        });

        // Handle field aliasing and requirements
        if (!studentData.registration_no) studentData.registration_no = studentData.enrollno;
        if (studentData.registration_no && studentData.student_name) {
          // Flatten/normalize data for the RPC
          batchData.push({
            registration_no: (studentData.registration_no || '').toString(),
            student_name: (studentData.student_name || '').toString(),
            school: (studentData.school || studentData.department || studentData.faculty || '').toString(),
            course: (studentData.course || studentData.program || studentData.degree || '').toString(),
            branch: (studentData.branch || studentData.specialization || studentData.major || '').toString(),
            admission_year: (studentData.admission_year || '').toString(),
            passing_year: (studentData.passing_year || studentData.graduation_year || '').toString(),
            parent_name: (studentData.parent_name || studentData.father_name || studentData.mother_name || '').toString(),
            country_code: (studentData.country_code || '+91').toString(),
            contact_no: (studentData.contact_no || studentData.phone || studentData.mobile || '').toString(),
            personal_email: (studentData.personal_email || studentData.email || '').toString(),
            college_email: (studentData.college_email || studentData.official_email || '').toString(),
            alumni_profile_link: (studentData.alumni_profile_link || studentData.alumni_link || '').toString(),
            alumni_screenshot_url: (studentData.alumni_screenshot_url || '').toString(),
            batch: (studentData.batch || studentData.class || studentData.section || '').toString(),
            section: (studentData.section || '').toString(),
            semester: (studentData.semester || studentData.sem || studentData.term || '').toString(),
            cgpa: (studentData.cgpa || studentData.gpa || '').toString(),
            backlogs: (studentData.backlogs || '0').toString(),
            roll_number: (studentData.roll_number || '').toString(),
            enrollment_number: (studentData.enrollment_number || '').toString(),
            date_of_birth: (studentData.date_of_birth || studentData.dob || '').toString(),
            gender: (studentData.gender || '').toString(),
            category: (studentData.category || '').toString(),
            blood_group: (studentData.blood_group || '').toString(),
            address: (studentData.address || '').toString(),
            city: (studentData.city || '').toString(),
            state: (studentData.state || '').toString(),
            pin_code: (studentData.pin_code || studentData.postal_code || studentData.zipcode || studentData.zip || '').toString(),
            emergency_contact_name: (studentData.emergency_contact_name || '').toString(),
            emergency_contact_no: (studentData.emergency_contact_no || '').toString()
          });
        }
      }

      if (batchData.length > 0) {
        process.stdout.write(`📤 Sending batch ${Math.floor(i / batchSize) + 1}... `);
        const { data: result, error } = await supabaseAdmin.rpc('bulk_map_excel_to_student_data', {
          student_records: batchData
        });

        if (error) {
          console.error(`\n❌ Batch error: ${error.message}`);
          errorCount += batchData.length;
        } else {
          // RPC returns table(success_count int, error_count int)
          // Result is an array like [{success_count: 1000, error_count: 0}]
          const res = result?.[0] || { success_count: 0, error_count: 0 };
          successCount += res.success_count;
          errorCount += res.error_count;
          console.log(`✅ ${successCount}/${totalRows} records synced.`);
        }
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`✅ Successfully imported: ${successCount} records`);
    console.log(`❌ Failed imports: ${errorCount} records`);


    // Errors are already logged to console during processing

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
