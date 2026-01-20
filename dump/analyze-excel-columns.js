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

async function analyzeExcelColumns() {
  const excelFilePath = path.join(__dirname, '..', 'data', 'Student data JU Jan2026.xlsx');
  
  console.log('📊 Analyzing Excel file structure...\n');
  
  try {
    // Read Excel file
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get headers and sample data
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = data[0];
    const sampleRow = data[1]; // First data row
    
    console.log('📋 EXCEL COLUMNS FOUND:');
    console.log('========================');
    
    headers.forEach((header, index) => {
      const sampleValue = sampleRow ? sampleRow[index] : 'N/A';
      console.log(`${index + 1}. "${header}" → Sample: "${sampleValue}"`);
    });
    
    console.log('\n🎯 NO DUES FORM FIELDS NEEDED:');
    console.log('=============================');
    console.log('✅ registration_no - Student registration number');
    console.log('✅ student_name - Full student name');
    console.log('✅ admission_year - Year of admission');
    console.log('✅ passing_year - Year of graduation');
    console.log('✅ parent_name - Father/Mother name');
    console.log('✅ school - School name (must match config_schools)');
    console.log('✅ course - Course name (must match config_courses)');
    console.log('✅ branch - Branch name (must match config_branches)');
    console.log('✅ country_code - Country code (+91)');
    console.log('✅ contact_no - Phone number');
    console.log('✅ personal_email - Personal email');
    console.log('✅ college_email - College email');
    console.log('✅ alumni_profile_link - Alumni profile URL');
    
    console.log('\n📊 MAPPING ANALYSIS:');
    console.log('==================');
    
    // Check which form fields we can map
    const formFields = [
      'registration_no', 'student_name', 'admission_year', 'passing_year',
      'parent_name', 'school', 'course', 'branch', 'country_code',
      'contact_no', 'personal_email', 'college_email', 'alumni_profile_link'
    ];
    
    const availableMappings = {};
    const missingFields = [];
    
    formFields.forEach(field => {
      // Check if any Excel column matches this field
      const matchingHeader = headers.find(header => {
        const normalizedHeader = header.toString().toLowerCase().replace(/[^a-z]/g, '');
        const normalizedField = field.toLowerCase().replace(/[^a-z]/g, '');
        return normalizedHeader.includes(normalizedField) || normalizedField.includes(normalizedHeader);
      });
      
      if (matchingHeader) {
        availableMappings[field] = matchingHeader;
        console.log(`✅ ${field} ← "${matchingHeader}"`);
      } else {
        missingFields.push(field);
        console.log(`❌ ${field} ← NOT FOUND`);
      }
    });
    
    console.log('\n🎯 RECOMMENDED MAPPING:');
    console.log('====================');
    
    // Smart mapping suggestions based on your Excel columns
    const mappingSuggestions = {
      'registration_no': ['EnrollNo', 'RollNo', 'ABCID'],
      'student_name': ['Name', 'FirstName + LastName'],
      'admission_year': ['Year', 'AdmissionBatch'],
      'passing_year': ['Year', 'AdmissionBatch'],
      'parent_name': ['FatherName', 'MotherName'],
      'school': 'Will need to be set based on Degree',
      'course': ['Degree'],
      'branch': ['Branch'],
      'country_code': 'Default to +91',
      'contact_no': ['StudentMobile'],
      'personal_email': ['EmailId'],
      'college_email': ['EmailId', 'Will need .jecrcu.edu.in domain'],
      'alumni_profile_link': 'Will need to be generated'
    };
    
    Object.entries(mappingSuggestions).forEach(([field, source]) => {
      if (Array.isArray(source)) {
        console.log(`${field}: Use "${source[0]}" or similar`);
      } else {
        console.log(`${field}: ${source}`);
      }
    });
    
    console.log('\n⚠️  ISSUES TO ADDRESS:');
    console.log('==================');
    
    if (missingFields.length > 0) {
      console.log('❌ Missing form fields:', missingFields.join(', '));
    }
    
    console.log('🔧 School/Course mapping needed - Excel has "Degree" but form needs separate School and Course');
    console.log('📧 Email validation needed - College email must end with @jecrcu.edu.in');
    console.log('🔗 Alumni profile links need to be generated for students');
    
    return { headers, availableMappings, missingFields };
    
  } catch (error) {
    console.error('💥 Analysis failed:', error.message);
    throw error;
  }
}

analyzeExcelColumns().catch(console.error);
