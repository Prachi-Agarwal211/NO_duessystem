const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(__dirname, '../data/Student data JU Jan2026.xlsx');

console.log('Checking Excel file at:', excelPath);

if (!fs.existsSync(excelPath)) {
  console.error('❌ Excel file not found');
  process.exit(1);
}

try {
  const workbook = XLSX.readFile(excelPath);
  const sheetNames = workbook.SheetNames;
  
  console.log('\n✅ File read successfully');
  console.log(`Contains ${sheetNames.length} sheets`);
  
  sheetNames.forEach((sheetName, index) => {
    console.log(`\n=== Sheet ${index + 1}: ${sheetName} ===`);
    
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    console.log(`Range: ${worksheet['!ref']}`);
    console.log(`Rows: ${range.e.r + 1}`);
    console.log(`Columns: ${range.e.c + 1}`);
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length > 0) {
      console.log('Headers:', jsonData[0]);
    }
    
    if (jsonData.length > 1) {
      console.log('Sample row:', jsonData[1]);
    }
  });
  
} catch (error) {
  console.error('\n❌ Error reading Excel file:');
  console.error(error);
}
