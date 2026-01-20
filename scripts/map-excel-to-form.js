const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(__dirname, '../data/Student data JU Jan2026.xlsx');

console.log('🔍 Mapping Excel data to no_dues_forms schema...\n');

try {
  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets['SelectedFieldReport_20260119_23'];
  const excelData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`✅ Found ${excelData.length} students in Excel`);
  
  // Current form schema fields
  const formFields = [
    'registration_no',
    'student_name',
    'admission_year',
    'passing_year',
    'parent_name',
    'school',
    'course',
    'branch',
    'contact_no',
    'personal_email',
    'college_email',
    'alumni_profile_link'
  ];
  
  console.log(`\n📋 Form Fields: ${formFields.length} fields`);
  formFields.forEach((field, index) => {
    console.log(`  ${index + 1}. ${field}`);
  });
  
  // Excel fields
  const excelFields = Object.keys(excelData[0]);
  console.log(`\n📊 Excel Fields: ${excelFields.length} fields`);
  excelFields.forEach((field, index) => {
    console.log(`  ${index + 1}. ${field}`);
  });
  
  // Mapping between Excel and Form fields
  const fieldMapping = {
    'registration_no': 'EnrollNo',        // Excel: EnrollNo (e.g., 16BBIN019)
    'student_name': 'Name',             // Excel: Name (full name)
    'admission_year': null,             // Need to extract from AdmissionBatch (e.g., 2016-17 → 2016)
    'passing_year': null,               // Need to calculate based on admission year and course duration
    'parent_name': 'FatherName',        // Excel: FatherName
    'school': null,                     // Need to map based on Degree and Branch
    'course': 'Degree',                // Excel: Degree (e.g., Bachelor of Science (Hons.))
    'branch': 'Branch',                // Excel: Branch (e.g., Biotechnology)
    'contact_no': 'StudentMobile',     // Excel: StudentMobile
    'personal_email': 'EmailId',       // Excel: EmailId
    'college_email': null,             // Generate from student_name and registration_no
    'alumni_profile_link': null        // Not available in Excel
  };
  
  console.log('\n🔗 Field Mapping:');
  Object.entries(fieldMapping).forEach(([formField, excelField]) => {
    const status = excelField ? '✅' : '❌';
    console.log(`  ${status} ${formField} → ${excelField || 'Not available'}`);
  });
  
  // Sample mapping
  console.log('\n🔍 Sample Student Mapping:');
  const sampleStudent = excelData[0];
  console.log(`  Excel EnrollNo: ${sampleStudent.EnrollNo}`);
  console.log(`  Form registration_no: ${sampleStudent.EnrollNo}`);
  console.log(`  Excel Name: ${sampleStudent.Name}`);
  console.log(`  Form student_name: ${sampleStudent.Name}`);
  console.log(`  Excel FatherName: ${sampleStudent.FatherName}`);
  console.log(`  Form parent_name: ${sampleStudent.FatherName}`);
  console.log(`  Excel Degree: ${sampleStudent.Degree}`);
  console.log(`  Form course: ${sampleStudent.Degree}`);
  console.log(`  Excel Branch: ${sampleStudent.Branch}`);
  console.log(`  Form branch: ${sampleStudent.Branch}`);
  
  // Calculate admission year from AdmissionBatch
  if (sampleStudent.AdmissionBatch) {
    const admissionYear = sampleStudent.AdmissionBatch.split('-')[0];
    console.log(`  Excel AdmissionBatch: ${sampleStudent.AdmissionBatch}`);
    console.log(`  Form admission_year: ${admissionYear}`);
  }
  
  // Generate college email
  const collegeEmail = sampleStudent.EnrollNo.toLowerCase() + '@jecrcuniversity.edu.in';
  console.log(`  Generated college_email: ${collegeEmail}`);
  
  // Check data quality issues
  console.log('\n🔍 Data Quality Checks:');
  const studentsWithoutEmail = excelData.filter(s => !s.EmailId || s.EmailId === 'NULL' || s.EmailId === null);
  const studentsWithoutMobile = excelData.filter(s => !s.StudentMobile || s.StudentMobile === 'NULL' || s.StudentMobile === null);
  const studentsWithoutFatherName = excelData.filter(s => !s.FatherName);
  
  console.log(`  Students without email: ${studentsWithoutEmail.length}`);
  console.log(`  Students without mobile: ${studentsWithoutMobile.length}`);
  console.log(`  Students without father name: ${studentsWithoutFatherName.length}`);
  
  if (studentsWithoutEmail.length > 0) {
    console.log(`  Sample missing emails: ${studentsWithoutEmail.slice(0, 3).map(s => s.EnrollNo).join(', ')}`);
  }
  
  // Write sample data to CSV for testing
  const sampleData = excelData.slice(0, 100).map(student => {
    const admissionYear = student.AdmissionBatch ? student.AdmissionBatch.split('-')[0] : null;
    return {
      registration_no: student.EnrollNo,
      student_name: student.Name,
      admission_year: admissionYear,
      passing_year: admissionYear ? parseInt(admissionYear) + 4 : null, // Assume 4-year course
      parent_name: student.FatherName,
      course: student.Degree,
      branch: student.Branch,
      contact_no: student.StudentMobile,
      personal_email: student.EmailId,
      college_email: student.EnrollNo.toLowerCase() + '@jecrcuniversity.edu.in',
      alumni_profile_link: null
    };
  });
  
  const csvContent = XLSX.utils.json_to_csv(sampleData);
  fs.writeFileSync(path.join(__dirname, '../data/sample_form_data.csv'), csvContent);
  console.log(`\n✅ Sample data saved to: data/sample_form_data.csv (100 records)`);
  
} catch (error) {
  console.error('❌ Error:', error);
}
