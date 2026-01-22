const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(process.cwd(), 'data', 'Student data JU Jan2026.xlsx');
const OUTPUT_PATH = path.join(process.cwd(), 'backups', 'student_source_of_truth.csv');

function cleanValue(value) {
    if (value === null || value === undefined || value === 'NULL') return '';
    return value.toString().trim();
}

async function convert() {
    console.log(`📖 Reading Excel: ${EXCEL_PATH}`);

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error('❌ Excel file not found!');
        process.exit(1);
    }

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with headers
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${data.length} records. Normalizing...`);

    // We want to normalize the headers to match our database fields as much as possible for easier comparison
    // Based on import-excel-to-student-data.js logic
    const normalizedData = data.map(row => {
        return {
            registration_no: cleanValue(row['EnrollNo'] || row['RollNo'] || row['Registration No'] || row['Reg No']),
            student_name: cleanValue(row['Name'] || row['Student Name'] || row['FirstName'] + ' ' + row['LastName']),
            school: cleanValue(row['School'] || row['Department'] || row['Faculty']),
            course: cleanValue(row['Course'] || row['Program'] || row['Degree']),
            branch: cleanValue(row['Branch'] || row['Specialization']),
            admission_year: cleanValue(row['Admission Year'] || row['AdmissionBatch']),
            personal_email: cleanValue(row['EmailId'] || row['Personal Email'] || row['Email']),
            contact_no: cleanValue(row['StudentMobile'] || row['Contact No'] || row['Phone'])
        };
    });

    const outputWorksheet = XLSX.utils.json_to_sheet(normalizedData);
    const csv = XLSX.utils.sheet_to_csv(outputWorksheet);

    fs.writeFileSync(OUTPUT_PATH, csv);
    console.log(`✅ Exported to ${OUTPUT_PATH} (${normalizedData.length} rows)`);
}

convert().catch(console.error);
