const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.join(process.cwd(), 'backups', 'student_source_of_truth.csv');
const BACKUP_PATH = path.join(process.cwd(), 'backups', 'student_data_2026-01-21.csv');

async function debugCompare() {
    console.log('🐞 Debugging Student CSVs...');

    const sourceWorkbook = XLSX.readFile(SOURCE_PATH);
    const sourceData = XLSX.utils.sheet_to_json(sourceWorkbook.Sheets[sourceWorkbook.SheetNames[0]]);

    const backupWorkbook = XLSX.readFile(BACKUP_PATH);
    const backupData = XLSX.utils.sheet_to_json(backupWorkbook.Sheets[backupWorkbook.SheetNames[0]]);

    console.log(`Total Source Rows: ${sourceData.length}`);
    console.log(`Total Backup Rows: ${backupData.length}`);

    const sourceRegNos = sourceData.map(r => r.registration_no ? r.registration_no.toString().trim().toUpperCase() : null).filter(Boolean);
    const backupRegNos = backupData.map(r => r.registration_no ? r.registration_no.toString().trim().toUpperCase() : null).filter(Boolean);

    console.log(`Source RegNos (found): ${sourceRegNos.length}`);
    console.log(`Backup RegNos (found): ${backupRegNos.length}`);

    const sourceSet = new Set(sourceRegNos);
    const backupSet = new Set(backupRegNos);

    console.log(`Unique Source RegNos: ${sourceSet.size}`);
    console.log(`Unique Backup RegNos: ${backupSet.size}`);

    const missingInBackup = [...sourceSet].filter(x => !backupSet.has(x));
    const missingInSource = [...backupSet].filter(x => !sourceSet.has(x));

    console.log(`Count Missing in Backup: ${missingInBackup.length}`);
    console.log(`Count Missing in Source: ${missingInSource.length}`);

    if (missingInBackup.length > 0) {
        console.log('First 5 Missing in Backup:', missingInBackup.slice(0, 5));
    }
}

debugCompare().catch(console.error);
