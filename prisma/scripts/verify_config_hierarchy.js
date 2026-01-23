const fs = require('fs');
const path = require('path');

const schoolsFile = path.join(__dirname, '../../backups/config_schools_2026-01-21.csv');
const coursesFile = path.join(__dirname, '../../backups/config_courses_2026-01-21.csv');
const branchesFile = path.join(__dirname, '../../backups/config_branches_2026-01-21.csv');

function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        // Basic split relative to standard schema
        const rawLine = lines[i];
        const values = [];
        let cv = '';
        let q = false;
        for (const c of rawLine) {
            if (c === '"') q = !q;
            else if (c === ',' && !q) { values.push(cv.trim().replace(/^"|"$/g, '')); cv = ''; }
            else cv += c;
        }
        values.push(cv.trim().replace(/^"|"$/g, ''));
        rows.push(values);
    }
    return rows;
}

const schools = parseCSV(schoolsFile).map(r => ({ id: r[0], name: r[1] }));
const courses = parseCSV(coursesFile).map(r => ({ id: r[0], schoolId: r[1], name: r[2] }));
const branches = parseCSV(branchesFile).map(r => ({ id: r[0], courseId: r[1], name: r[2] }));

console.log('# Configuration Hierarchy Report\n');

schools.sort((a, b) => a.name.localeCompare(b.name)).forEach(school => {
    console.log(`### 🏫 ${school.name}`);

    const schoolCourses = courses.filter(c => c.schoolId === school.id);
    if (schoolCourses.length === 0) {
        console.log(`- *(No Courses)*`);
    }

    schoolCourses.sort((a, b) => a.name.localeCompare(b.name)).forEach(course => {
        console.log(`- **${course.name}**`);

        const courseBranches = branches.filter(b => b.courseId === course.id);
        if (courseBranches.length === 0) {
            console.log(`  - *(No Branches)*`);
        } else {
            // Group branches if many? No, list them.
            courseBranches.sort((a, b) => a.name.localeCompare(b.name)).forEach(branch => {
                console.log(`  - ${branch.name}`);
            });
        }
    });
    console.log('');
});
