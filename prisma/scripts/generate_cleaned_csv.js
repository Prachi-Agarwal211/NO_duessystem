/**
 * GENERATE CLEANED CSV
 * 
 * 1. Loads Config CSVs (Schools, Courses, Branches) to establish valid UUIDs.
 * 2. Reads Raw Student Data.
 * 3. Maps Raw -> Config UUIDs using `data_mapping_config.js`.
 * 4. Outputs `processed/cleaned_student_data.csv` and `processed/mapping_errors.csv`.
 */

const fs = require('fs');
const path = require('path');
const mappings = require('./data_mapping_config');

const BACKUPS_DIR = path.join(__dirname, '../../backups');
const OUTPUT_DIR = path.join(__dirname, '../../processed_data');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// Helper: Parse CSV
function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = {};
        const values = []; // Handle quotes roughly
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

// Helper: Find file by prefix in backups
function findFile(prefix) {
    const files = fs.readdirSync(BACKUPS_DIR);
    return files.find(f => f.startsWith(prefix) && f.endsWith('.csv'));
}

async function main() {
    console.log('🚀 Starting Data Cleaning Process...');

    // 1. Load Configs
    console.log('📦 Loading Configuration Tables...');

    // Schools
    const schoolFile = findFile('config_schools'); // Using latest
    const schools = parseCSV(fs.readFileSync(path.join(BACKUPS_DIR, schoolFile), 'utf-8'));
    // Map Name -> ID
    const schoolMap = new Map(schools.map(s => [s.name, s.id]));
    console.log(`   - Loaded ${schools.length} Schools`);

    // Courses
    const courseFile = findFile('config_courses');
    const courses = parseCSV(fs.readFileSync(path.join(BACKUPS_DIR, courseFile), 'utf-8'));
    // Map Name -> [{ id, schoolId, name }]
    const courseMap = new Map();
    courses.forEach(c => {
        if (!courseMap.has(c.name)) courseMap.set(c.name, []);
        courseMap.get(c.name).push(c);
    });
    console.log(`   - Loaded ${courses.length} Courses`);

    // Branches
    const branchFile = findFile('config_branches');
    const branches = parseCSV(fs.readFileSync(path.join(BACKUPS_DIR, branchFile), 'utf-8'));
    // Map Name -> [{ id, courseId, name }]
    const branchMap = new Map();
    branches.forEach(b => {
        if (!branchMap.has(b.name)) branchMap.set(b.name, []);
        branchMap.get(b.name).push(b);
    });
    console.log(`   - Loaded ${branches.length} Branches`);


    // 2. Process Student Data
    const rawFile = 'Student_data_JU_Jan2026_FULL.csv';
    console.log(`\n📂 Reading Raw Data: ${rawFile}`);
    const rawData = parseCSV(fs.readFileSync(path.join(BACKUPS_DIR, rawFile), 'utf-8'));

    const cleanedData = [];
    const errors = [];

    console.log(`   - Processing ${rawData.length} records...`);

    let successCount = 0;
    let failCount = 0;

    for (const row of rawData) {
        let errorReason = [];

        // 2a. Map Course
        const rawDegree = row['Degree'];
        let targetCourseName = mappings.courseNameMap[rawDegree] || rawDegree;

        let validCourse = null;
        let validSchoolId = null;

        const courseCandidates = courseMap.get(targetCourseName);

        if (!courseCandidates || courseCandidates.length === 0) {
            errorReason.push(`Course not found: "${rawDegree}" (Mapped: "${targetCourseName}")`);
        } else if (courseCandidates.length === 1) {
            validCourse = courseCandidates[0];
            validSchoolId = validCourse.school_id;
        } else {
            validCourse = courseCandidates[0];
            validSchoolId = validCourse.school_id;
        }

        // 2b. Map Branch
        const rawBranch = row['Branch'];
        let targetBranchName = mappings.branchNameMap[rawBranch] || rawBranch;

        let validBranch = null;

        if (validCourse) {
            const branchCandidates = branchMap.get(targetBranchName);
            // Try exact match first
            let matchedBranch = branchCandidates?.find(b => b.course_id === validCourse.id);

            // Special handling for Design (Interior, Fashion)
            if (!matchedBranch) {
                const courseBranches = branches.filter(b => b.course_id === validCourse.id);
                // 1. Try case-insensitive matches
                matchedBranch = courseBranches.find(b => b.name.toLowerCase() === targetBranchName.toLowerCase());

                // 2. Try partial matches
                if (!matchedBranch) {
                    matchedBranch = courseBranches.find(b =>
                        b.name.toLowerCase().includes(targetBranchName.toLowerCase()) ||
                        targetBranchName.toLowerCase().includes(b.name.toLowerCase())
                    );
                }
            }

            if (matchedBranch) {
                validBranch = matchedBranch;
            } else {
                // GLOBAL LOOKUP STRATEGY
                // If not found in the specific course, look for this branch name GLOBALLY.
                // If found and unique, update the validCourse to the one owning this branch.

                // 1. Exact Name Match Globally
                const globalMatches = branches.filter(b => b.name.toLowerCase() === targetBranchName.toLowerCase());

                if (globalMatches.length >= 1) {
                    // If unique or we pick the first one?
                    // Safe approach: Pick the first match, but update the course.
                    const bestMatch = globalMatches[0];

                    validBranch = bestMatch;

                    // Update course
                    const newCourse = courses.find(c => c.id === validBranch.course_id);
                    if (newCourse) {
                        validCourse = newCourse;
                        validSchoolId = newCourse.school_id;
                        // console.log(`Auto-corrected Course for branch "${targetBranchName}": ${newCourse.name}`);
                    }
                } else {
                    // Try Global Fuzzy?
                    // Careful with fuzzy global, but let's try it for high value.
                    const fuzzyGlobal = branches.find(b =>
                        b.name.toLowerCase().includes(targetBranchName.toLowerCase()) &&
                        targetBranchName.length > 5 // simple guard
                    );

                    if (fuzzyGlobal) {
                        validBranch = fuzzyGlobal;
                        const newCourse = courses.find(c => c.id === validBranch.course_id);
                        if (newCourse) {
                            validCourse = newCourse;
                            validSchoolId = newCourse.school_id;
                        }
                    } else {
                        errorReason.push(`Branch not found: "${rawBranch}" (Mapped: "${targetBranchName}")`);
                    }
                }
            }
        }

        // 2c. Final Decision
        if (validCourse && validBranch) {
            let regNo = row['EnrollNo'] || row['RollNo'] || row['EnrollmentNo'] || row['RegNo'] || row['RegistrationNo'];

            if (!regNo) {
                if (row['Name']) {
                    regNo = 'MISSING-' + Math.random().toString(36).substr(2, 6).toUpperCase();
                }
            }

            if (regNo) {
                // Extract admission year from AdmissionDate (format: M/D/YY or YYYY-MM-DD)
                let admissionYear = '';
                const admissionDate = row['AdmissionDate'] || '';
                if (admissionDate) {
                    // Try to match 4-digit year first (e.g., 2016)
                    const yearMatch4 = admissionDate.match(/(\d{4})/);
                    if (yearMatch4) {
                        admissionYear = yearMatch4[1];
                    } else {
                        // Try to match 2-digit year, usually at the end (e.g., /16 or -16)
                        const yearMatch2 = admissionDate.match(/[\/\-](\d{2})$/);
                        if (yearMatch2) {
                            admissionYear = '20' + yearMatch2[1];
                        }
                    }
                }

                // Extract parent name: prioritize FatherName, fall back to MotherName
                const fatherName = (row['FatherName'] || '').trim();
                const motherName = (row['MotherName'] || '').trim();
                let parentName = '';
                if (fatherName && fatherName !== 'NULL' && fatherName !== '') {
                    parentName = fatherName;
                } else if (motherName && motherName !== 'NULL' && motherName !== '') {
                    parentName = motherName;
                }

                // Keep passing year empty for students to fill
                let passingYear = '';

                // Clean contact number
                let contactNo = row['StudentMobile'] || row['Mobile'] || '';
                if (contactNo === 'NULL' || contactNo === '0') {
                    contactNo = '';
                }

                cleanedData.push({
                    registration_no: regNo,
                    student_name: row['Name'],
                    school_id: validSchoolId,
                    course_id: validCourse.id,
                    branch_id: validBranch.id,
                    email: row['EmailId'] || row['Email'] || '',
                    contact_no: contactNo,
                    parent_name: parentName,
                    admission_year: admissionYear,
                    passing_year: passingYear,
                    raw_degree: rawDegree,
                    raw_branch: rawBranch
                });
                successCount++;
            }
        } else {
            errors.push({
                ...row,
                error_reason: errorReason.join('; ')
            });
            failCount++;
        }
    }

    // 3. Write Outputs
    const cleanHeader = 'registration_no,student_name,school_id,course_id,branch_id,email,contact_no,parent_name,admission_year,passing_year,raw_degree,raw_branch';
    const cleanCsvContent = [cleanHeader, ...cleanedData.map(d => Object.values(d).map(v => `"${v}"`).join(','))].join('\n');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'cleaned_student_data.csv'), cleanCsvContent);

    // Write errors only if there are any
    if (errors.length > 0) {
        const errorHeader = Object.keys(errors[0] || {}).join(',');
        const errorCsvContent = [errorHeader, ...errors.map(d => Object.values(d).map(v => `"${v}"`).join(','))].join('\n');
        fs.writeFileSync(path.join(OUTPUT_DIR, 'mapping_errors.csv'), errorCsvContent);
    } else {
        if (fs.existsSync(path.join(OUTPUT_DIR, 'mapping_errors.csv'))) {
            fs.unlinkSync(path.join(OUTPUT_DIR, 'mapping_errors.csv'));
        }
    }

    console.log(`\n✅ Finished Processing:`);
    console.log(`   - Successful: ${successCount}`);
    console.log(`   - Failed:     ${failCount}`);
    console.log(`\nOutputs saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
