const fs = require('fs');
const path = require('path');

const errorFile = path.join(__dirname, '../../processed_data/mapping_errors.csv');

function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = {};
        const values = [];
        let current = '';
        let inQuotes = false;
        for (const char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
            else current += char;
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        headers.forEach((h, idx) => row[h] = values[idx] || '');
        rows.push(row);
    }
    return rows;
}

if (!fs.existsSync(errorFile)) {
    console.log('No error file found.');
    process.exit(0);
}

const content = fs.readFileSync(errorFile, 'utf-8');
const rows = parseCSV(content);

const reportLines = [];
reportLines.push(`Total Errors: ${rows.length}`);

const degreeCounts = {};
const branchCounts = {};
const errorReasons = {};
const combinedCounts = {};

rows.forEach(r => {
    const degree = r['Degree'] || 'MISSING';
    const branch = r['Branch'] || 'MISSING';
    const reason = r['error_reason'] || 'UNKNOWN';

    degreeCounts[degree] = (degreeCounts[degree] || 0) + 1;
    branchCounts[branch] = (branchCounts[branch] || 0) + 1;

    // Simplistic reason grouping
    const shortReason = reason.split(':')[0];
    errorReasons[shortReason] = (errorReasons[shortReason] || 0) + 1;

    const key = `${degree} || ${branch}`;
    combinedCounts[key] = (combinedCounts[key] || 0) + 1;
});

reportLines.push('\n--- Top 10 Failed Degrees ---');
Object.entries(degreeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => reportLines.push(`${v}: ${k}`));

reportLines.push('\n--- Top 20 Failed Branches ---');
Object.entries(branchCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => reportLines.push(`${v}: ${k}`));

reportLines.push('\n--- Top 20 Failed Combinations (Degree || Branch) ---');
Object.entries(combinedCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => reportLines.push(`${v}: ${k}`));

reportLines.push('\n--- Error Reasons ---');
Object.entries(errorReasons).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => reportLines.push(`${v}: ${k}`));

fs.writeFileSync(path.join(__dirname, '../../processed_data/analysis_report.txt'), reportLines.join('\n'));
console.log('Report written to processed_data/analysis_report.txt');
