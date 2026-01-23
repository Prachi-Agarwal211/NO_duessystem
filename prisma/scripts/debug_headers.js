const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../../backups/Student_data_JU_Jan2026_FULL.csv');
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');
const headers = lines[0].split(',').map(h => `"${h.trim()}"`);
console.log('Headers:', headers.join(', '));
const firstRow = lines[1];
console.log('Row 1:', firstRow);
