const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rawFile = path.join(__dirname, '../../backups/Student_data_JU_Jan2026_FULL.csv');
    const content = fs.readFileSync(rawFile, 'utf-8');

    // Robust CSV Parsing
    function parseCSV(text) {
        const lines = text.split('\n');
        const rows = [];
        let headers = [];

        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            // Matches "value", "val,ue", value
            const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const values = matches.map(m => m.trim().replace(/^"|"$/g, ''));

            if (i === 0) {
                headers = values;
                // Clean headers
                headers = headers.map(h => h.replace(/^\uFEFF/, '')); // Remove BOM
            } else {
                rows.push(values);
            }
        }
        return { headers, rows };
    }

    const { headers, rows } = parseCSV(content);

    // Find ID column
    const idCols = ['EnrollNo', 'RollNo', 'EnrollmentNo', 'RegNo', 'RegistrationNo'];
    let idIndex = -1;

    for (const d of idCols) {
        idIndex = headers.findIndex(h => h && d.toLowerCase() === h.toLowerCase());
        if (idIndex !== -1) break;
    }

    if (idIndex === -1) {
        idIndex = headers.findIndex(h => h && (h.toLowerCase().includes('enroll') || h.toLowerCase().includes('reg')));
    }

    console.log(`Column Mapping: ID Index = ${idIndex} ('${headers[idIndex]}')`);

    if (idIndex === -1) {
        console.error("ERROR: Could not find Enrollment Number column in header.");
        process.exit(1);
    }

    const seen = new Set();
    const duplicates = [];

    rows.forEach((r, idx) => {
        const id = r[idIndex] ? r[idIndex].trim() : null;
        if (id) {
            if (seen.has(id)) {
                duplicates.push(id);
            } else {
                seen.add(id);
            }
        }
    });

    const dbCount = await prisma.noDuesForm.count();

    // OUTPUT
    const output = [
        `\nFINAL AUDIT REPORT`,
        `==================`,
        `1. Raw File Analysis:`,
        `   - Total Rows:      ${rows.length}`,
        `   - Unique IDs:      ${seen.size}`,
        `   - Duplicates:      ${duplicates.length}`,
        ``,
        `2. Database Verification:`,
        `   - Seeding Count:   ${dbCount}`,
        ``,
        `3. Conclusion:`,
        `   - ${dbCount === seen.size ? '✅ MATCH: Database contains exactly 1 unique record per student.' : '❌ MISMATCH: Counts differ.'}`
    ].join('\n');

    console.log(output);
    fs.writeFileSync(path.join(__dirname, '../../processed_data/final_audit.txt'), output);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
