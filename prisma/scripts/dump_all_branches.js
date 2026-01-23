const fs = require('fs');
const path = require('path');

const branchFile = path.join(__dirname, '../../backups/config_branches_2026-01-21.csv');

function parseCSV(content) {
    const lines = content.split('\n');
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const values = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
            else current += char;
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        // Name is likely index 2
        if (values[2]) rows.push(values[2]);
    }
    return rows;
}

const content = fs.readFileSync(branchFile, 'utf-8');
const branches = parseCSV(content);

fs.writeFileSync(path.join(__dirname, '../../processed_data/all_branches.txt'), branches.join('\n'));
console.log(`Dumped ${branches.length} branches to processed_data/all_branches.txt`);
