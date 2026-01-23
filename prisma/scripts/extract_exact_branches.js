const fs = require('fs');
const path = require('path');

const branchFile = path.join(__dirname, '../../backups/config_branches_2026-01-21.csv');
const keywords = [
    'Samatrix', 'Sunstone', 'Xebia', 'IBM', 'ACCA', 'ISDC',
    'Artificial Intelligence', 'Journalism', 'Physiotherapy',
    'Graphic Design', 'Visual Arts', 'Hotel Management', 'B. Des'
];

function parseCSV(content) {
    const lines = content.split('\n');
    // Assuming standard CSV with header
    // id,course_id,name,...
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        // Simple split might fail on quotes, but branch names usually don't have commas? 
        // Let's use a regex split or the robust parser I wrote earlier.
        // Robust parser copypasta:
        const values = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
            else current += char;
        }
        values.push(current.trim().replace(/^"|"$/g, ''));

        // Index 2 is likely Name (id=0, course_id=1, name=2) based on manual inspection of previous outputs?
        // Let's print all valid names.
        if (values[2]) rows.push(values[2]);
    }
    return rows;
}

const content = fs.readFileSync(branchFile, 'utf-8');
const branches = parseCSV(content);

console.log('--- FOUND BRANCHES ---');
branches.forEach(b => {
    if (keywords.some(k => b.toLowerCase().includes(k.toLowerCase()))) {
        console.log(`"${b}"`);
    }
});
