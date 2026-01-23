const fs = require('fs');
const path = require('path');

const rawFile = path.join(__dirname, '../../backups/Student_data_JU_Jan2026_FULL.csv');
const content = fs.readFileSync(rawFile, 'utf-8');

function parse() {
    const lines = content.split('\n');
    const rows = [];
    let header = [];

    // Robust header parsing
    // Handle BOM
    let headerLine = lines[0].replace(/^\uFEFF/, '');
    // simple split, assume headers don't have commas
    header = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // Find ID Index
    let idIdx = header.findIndex(h => h === 'EnrollNo');
    if (idIdx === -1) idIdx = header.findIndex(h => h === 'EnrollmentNo');
    if (idIdx === -1) idIdx = header.findIndex(h => h.toLowerCase().includes('enroll'));
    if (idIdx === -1) idIdx = header.findIndex(h => h.toLowerCase().includes('reg'));

    console.log(`Header found: ${header.join(', ')}`);
    console.log(`Using ID Column: ${header[idIdx]} (Index: ${idIdx})`);

    if (idIdx === -1) {
        console.error('Cannot find ID column!');
        process.exit(1);
    }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Handle quoted values logic roughly
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const vals = matches.map(v => v.trim().replace(/^"|"$/g, ''));

        // Fallback for simple split if matches fail (sometimes regex misses empty cols)
        // Actually, simple split is safer if we know data structure
        // let vals = line.split(','); 
        // But let's trust regex for quoted.

        rows.push(vals[idIdx]);
    }
    return rows;
}

const ids = parse();

console.log(`Total Rows Parsed: ${ids.length}`);

const seen = new Set();
const dups = [];

ids.forEach(id => {
    if (!id) return;
    const cleanId = id.trim();
    if (seen.has(cleanId)) {
        dups.push(cleanId);
    } else {
        seen.add(cleanId);
    }
});

console.log(`Unique IDs: ${seen.size}`);
console.log(`Duplicate Rows: ${dups.length}`);
