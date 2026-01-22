const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(process.cwd(), 'data', 'Student data JU Jan2026.xlsx');
const OUTPUT_PATH = path.join(process.cwd(), 'backups', 'Student_data_JU_Jan2026_FULL.csv');

async function convertFull() {
    console.log(`📖 Reading Full Excel: ${EXCEL_PATH}`);

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error('❌ Excel file not found!');
        process.exit(1);
    }

    // Load workbook
    const workbook = XLSX.readFile(EXCEL_PATH);

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    console.log(`📊 Sheet Name: ${sheetName}`);

    // Convert directly to CSV
    console.log('🔄 Converting to CSV (Total columns and rows)...');
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // Save to file
    fs.writeFileSync(OUTPUT_PATH, csv);

    console.log(`✅ SUCCESS! Saved full raw data to: ${OUTPUT_PATH}`);

    // Quick stats
    const lines = csv.split('\n').filter(Boolean).length;
    console.log(`📈 Rows converted: ${lines}`);
}

convertFull().catch(console.error);
