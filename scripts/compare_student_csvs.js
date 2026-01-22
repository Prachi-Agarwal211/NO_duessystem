const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.join(process.cwd(), 'backups', 'student_source_of_truth.csv');
const BACKUP_PATH = path.join(process.cwd(), 'backups', 'student_data_2026-01-21.csv');

async function compare() {
    console.log('🔍 Comparing Student CSVs...');

    if (!fs.existsSync(SOURCE_PATH) || !fs.existsSync(BACKUP_PATH)) {
        console.error('❌ One or both CSV files are missing!');
        process.exit(1);
    }

    const sourceWorkbook = XLSX.readFile(SOURCE_PATH);
    const sourceData = XLSX.utils.sheet_to_json(sourceWorkbook.Sheets[sourceWorkbook.SheetNames[0]]);

    const backupWorkbook = XLSX.readFile(BACKUP_PATH);
    const backupData = XLSX.utils.sheet_to_json(backupWorkbook.Sheets[backupWorkbook.SheetNames[0]]);

    console.log(`📈 Source rows: ${sourceData.length}`);
    console.log(`📉 Backup rows: ${backupData.length}`);

    const sourceMap = new Map();
    sourceData.forEach(row => {
        if (row.registration_no) {
            sourceMap.set(row.registration_no.toString().trim().toUpperCase(), row);
        }
    });

    const backupMap = new Map();
    backupData.forEach(row => {
        if (row.registration_no) {
            backupMap.set(row.registration_no.toString().trim().toUpperCase(), row);
        }
    });

    const missingInBackup = [];
    sourceMap.forEach((row, regNo) => {
        if (!backupMap.has(regNo)) {
            missingInBackup.push(regNo);
        }
    });

    const missingInSource = [];
    backupMap.forEach((row, regNo) => {
        if (!sourceMap.has(regNo)) {
            missingInSource.push(regNo);
        }
    });

    const mismatches = [];
    sourceMap.forEach((sRow, regNo) => {
        const bRow = backupMap.get(regNo);
        if (bRow) {
            // Compare fields
            const fieldsToCompare = ['student_name', 'school', 'course', 'branch'];
            fieldsToCompare.forEach(field => {
                const sVal = (sRow[field] || '').toString().trim().toLowerCase();
                const bVal = (bRow[field] || '').toString().trim().toLowerCase();

                // Only report if source value isn't empty (we don't care if backup has more info)
                if (sVal && sVal !== bVal) {
                    mismatches.push({
                        regNo,
                        field,
                        source: sRow[field],
                        backup: bRow[field]
                    });
                }
            });
        }
    });

    console.log('\n--- COMPARISON REPORT ---');
    console.log(`❌ Missing in Backup (Database): ${missingInBackup.length}`);
    console.log(`❓ Missing in Source (Excel): ${missingInSource.length}`);
    console.log(`⚠️ Field Mismatches (Name/School/Course/Branch): ${mismatches.length}`);

    if (missingInBackup.length > 0) {
        console.log('\n🚩 First 10 Missing in Backup:');
        console.log(missingInBackup.slice(0, 10));
    }

    if (mismatches.length > 0) {
        console.log('\n🔍 First 10 Mismatches:');
        mismatches.slice(0, 10).forEach(m => {
            console.log(`  RegNo: ${m.regNo} | Field: ${m.field} | Source: "${m.source}" | Backup: "${m.backup}"`);
        });
    }

    // Save detailed report
    const report = {
        missingInBackup,
        missingInSource,
        mismatches
    };
    fs.writeFileSync(path.join(process.cwd(), 'backups', 'comparison_report.json'), JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed JSON report saved to backups/comparison_report.json');
}

compare().catch(console.error);
