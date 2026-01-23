/**
 * Analyze raw student CSV to extract unique values
 * and compare with config tables for mapping
 */

const fs = require('fs');
const path = require('path');

// Parse CSV manually (simple parser)
function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Handle quoted fields
        const values = [];
        let current = '';
        let inQuotes = false;

        for (const char of lines[i]) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
        });
        rows.push(row);
    }

    return rows;
}

async function main() {
    const backupsDir = path.join(__dirname, '../../backups');

    // Load raw CSV
    const rawCsvPath = path.join(backupsDir, 'Student_data_JU_Jan2026_FULL.csv');
    const rawContent = fs.readFileSync(rawCsvPath, 'utf-8');
    const students = parseCSV(rawContent);

    console.log(`Total students in raw CSV: ${students.length}`);
    console.log(`\nHeaders: ${Object.keys(students[0]).join(', ')}`);

    // Extract unique values
    const uniqueDegrees = new Set();
    const uniqueBranches = new Set();
    const degreeCount = {};
    const branchCount = {};

    students.forEach(s => {
        const degree = s.Degree || '';
        const branch = s.Branch || '';

        if (degree) {
            uniqueDegrees.add(degree);
            degreeCount[degree] = (degreeCount[degree] || 0) + 1;
        }
        if (branch) {
            uniqueBranches.add(branch);
            branchCount[branch] = (branchCount[branch] || 0) + 1;
        }
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log('UNIQUE DEGREES (Courses) - ' + uniqueDegrees.size + ' total');
    console.log('='.repeat(60));

    const sortedDegrees = [...uniqueDegrees].sort();
    sortedDegrees.forEach(d => {
        console.log(`  "${d}" (${degreeCount[d]} students)`);
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log('UNIQUE BRANCHES - ' + uniqueBranches.size + ' total');
    console.log('='.repeat(60));

    const sortedBranches = [...uniqueBranches].sort();
    sortedBranches.forEach(b => {
        console.log(`  "${b}" (${branchCount[b]} students)`);
    });

    // Load config CSVs for comparison
    console.log(`\n${'='.repeat(60)}`);
    console.log('LOADING CONFIG DATA FOR COMPARISON');
    console.log('='.repeat(60));

    // Load schools
    const schoolsPath = path.join(backupsDir, 'config_schools_2026-01-21.csv');
    const schoolsContent = fs.readFileSync(schoolsPath, 'utf-8');
    const schools = parseCSV(schoolsContent);
    console.log(`\nConfig Schools (${schools.length}):`);
    schools.forEach(s => console.log(`  - "${s.name}" (ID: ${s.id})`));

    // Load courses
    const coursesPath = path.join(backupsDir, 'config_courses_2026-01-21.csv');
    const coursesContent = fs.readFileSync(coursesPath, 'utf-8');
    const courses = parseCSV(coursesContent);
    console.log(`\nConfig Courses (${courses.length}):`);
    courses.forEach(c => console.log(`  - "${c.name}" (School: ${c.school_id?.slice(0, 8)}...)`));

    // Load branches
    const branchesPath = path.join(backupsDir, 'config_branches_2026-01-21.csv');
    const branchesContent = fs.readFileSync(branchesPath, 'utf-8');
    const branches = parseCSV(branchesContent);
    console.log(`\nConfig Branches (${branches.length}):`);

    // Write output to JSON for analysis
    const outputPath = path.join(backupsDir, 'data_analysis.json');
    const analysis = {
        rawStats: {
            totalStudents: students.length,
            uniqueDegrees: sortedDegrees,
            uniqueBranches: sortedBranches,
            degreeCount,
            branchCount
        },
        configData: {
            schools: schools.map(s => ({ id: s.id, name: s.name })),
            courses: courses.map(c => ({ id: c.id, name: c.name, schoolId: c.school_id })),
            branches: branches.map(b => ({ id: b.id, name: b.name, courseId: b.course_id }))
        }
    };

    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\nAnalysis saved to: ${outputPath}`);
}

main().catch(console.error);
