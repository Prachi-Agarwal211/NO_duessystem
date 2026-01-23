/**
 * SEED FULL DATABASE
 * 
 * 1. Clean existing data (Optional/Safe Mode)
 * 2. Seed Configuration Tables (Schools, Courses, Branches) from backups
 * 3. Seed Student Data from `processed_data/cleaned_student_data.csv`
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load .env manually
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^"|"$/g, '');
        }
    });
} else {
    console.warn('⚠️ No .env file found!');
}

const prisma = new PrismaClient();

// Helper: Parse CSV manually
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

// Helper: Sanitize field
function sanitize(val) {
    if (!val) return null;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === 'NULL' || trimmed === 'null') return null;
        return trimmed;
    }
    return val;
}

// Config File Loading Helper
function loadConfigCSV(filename) {
    const backupsDir = path.join(__dirname, '../../backups');
    const files = fs.readdirSync(backupsDir);
    const file = files.find(f => f.startsWith(filename) && f.endsWith('.csv'));

    if (!file) {
        console.warn(`⚠️ Warning: Config file not found for prefix: ${filename}`);
        return [];
    }
    const content = fs.readFileSync(path.join(backupsDir, file), 'utf-8');
    return parseCSV(content);
}

// Main Seed Function
async function main() {
    console.log('🌱 Starting Full Database Seeding...');

    try {
        // 1. CLEAN DATABASE
        console.log('🧹 Cleaning existing data...');
        try {
            await prisma.auditLog.deleteMany();
            await prisma.emailLog.deleteMany();
            await prisma.supportTicket.deleteMany();
            await prisma.certificateVerification.deleteMany();
            await prisma.noDuesMessage.deleteMany();
            await prisma.noDuesReapplicationHistory.deleteMany();
            await prisma.studentData.deleteMany();
            await prisma.noDuesStatus.deleteMany();
            await prisma.noDuesForm.deleteMany();
            await prisma.profile.deleteMany();
            await prisma.department.deleteMany();
            await prisma.configBranch.deleteMany();
            await prisma.configCourse.deleteMany();
            await prisma.configSchool.deleteMany();
        } catch (e) {
            console.log('   - Tables might be already empty or error: ' + e.message);
        }
        console.log('   - Tables truncated.');

        // 2. SEED CONFIGS
        console.log('📚 Seeding Configuration Tables...');
        const schools = loadConfigCSV('config_schools');
        for (const s of schools) {
            await prisma.configSchool.create({
                data: {
                    id: s.id,
                    name: s.name,
                    displayOrder: parseInt(s.display_order || '0'),
                    isActive: s.is_active === 'TRUE' || s.is_active === 'true'
                }
            });
        }
        console.log(`   - Created ${schools.length} Schools`);

        const courses = loadConfigCSV('config_courses');
        for (const c of courses) {
            await prisma.configCourse.create({
                data: {
                    id: c.id,
                    schoolId: c.school_id,
                    name: c.name,
                    displayOrder: parseInt(c.display_order || '0'),
                    isActive: c.is_active === 'TRUE' || c.is_active === 'true'
                }
            });
        }
        console.log(`   - Created ${courses.length} Courses`);

        const branches = loadConfigCSV('config_branches');
        for (const b of branches) {
            await prisma.configBranch.create({
                data: {
                    id: b.id,
                    courseId: b.course_id,
                    name: b.name,
                    displayOrder: parseInt(b.display_order || '0'),
                    isActive: b.is_active === 'TRUE' || b.is_active === 'true'
                }
            });
        }
        console.log(`   - Created ${branches.length} Branches`);

        const depts = loadConfigCSV('departments');
        for (const d of depts) {
            await prisma.department.create({
                data: {
                    id: d.id,
                    name: d.name,
                    displayName: d.display_name,
                    email: d.email,
                    isSchoolSpecific: d.is_school_specific === 'TRUE',
                    isActive: d.is_active === 'TRUE',
                    displayOrder: parseInt(d.display_order || '0')
                }
            });
        }
        console.log(`   - Created ${depts.length} Departments`);


        // 3. SEED STUDENTS & NO DUES FORMS
        console.log('👥 Seeding Students from Cleaned CSV...');
        const cleanCsvPath = path.join(__dirname, '../../processed_data/cleaned_student_data.csv');

        if (!fs.existsSync(cleanCsvPath)) {
            throw new Error('Cleaned CSV not found! Run generate_cleaned_csv.js first.');
        }

        const studentData = parseCSV(fs.readFileSync(cleanCsvPath, 'utf-8'));
        console.log(`   - Found ${studentData.length} records to seed.`);

        let batchSize = 100;
        let processed = 0;

        const schoolNameMap = new Map(schools.map(s => [s.id, s.name]));
        const courseNameMap = new Map(courses.map(c => [c.id, c.name]));
        const branchNameMap = new Map(branches.map(b => [b.id, b.name]));

        const chunks = [];
        for (let i = 0; i < studentData.length; i += batchSize) {
            chunks.push(studentData.slice(i, i + batchSize));
        }

        console.log(`   - Processing ${chunks.length} batches...`);

        for (const [index, chunk] of chunks.entries()) {
            const forms = [];
            const students = [];

            chunk.forEach(row => {
                const formId = crypto.randomUUID();
                const regNo = sanitize(row.registration_no) || 'UNKNOWN-' + index;

                const schoolName = schoolNameMap.get(row.school_id) || '';
                const courseName = courseNameMap.get(row.course_id) || '';
                const branchName = branchNameMap.get(row.branch_id) || '';

                const email = sanitize(row.email);
                const contact = sanitize(row.contact_no);

                forms.push({
                    id: formId,
                    registrationNo: regNo,
                    studentName: sanitize(row.student_name) || 'Unknown',
                    schoolId: row.school_id,
                    school: schoolName,
                    courseId: row.course_id,
                    course: courseName,
                    branchId: row.branch_id,
                    branch: branchName,
                    email: email,
                    contactNo: contact,
                    status: 'PENDING',
                    isReapplication: false,
                    reapplicationCount: 0,
                    finalCertificateGenerated: false,
                    blockchainVerified: false,
                    countryCode: '+91',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                students.push({
                    id: crypto.randomUUID(),
                    formId: formId,
                    registrationNo: regNo,
                    studentName: sanitize(row.student_name) || 'Unknown',
                    school: schoolName,
                    course: courseName,
                    branch: branchName,
                    personalEmail: email,
                    contactNo: contact,
                    updatedAt: new Date(),
                    updatedBy: 'SEED_SCRIPT'
                });
            });

            try {
                await prisma.$transaction([
                    prisma.noDuesForm.createMany({ data: forms, skipDuplicates: true }),
                    prisma.studentData.createMany({ data: students, skipDuplicates: true })
                ]);
            } catch (err) {
                console.error(`❌ Batch ${index} failed:`, JSON.stringify(err, null, 2));
                // throw err; // Don't throw, try to continue to next batch? 
                // Actually, if we skip errors, we lose data.
                // But skipDuplicates: true on Postgres *should* handle conflicts if any.
                // If it's another error, print and stop.
                throw err;
            }

            processed += chunk.length;
            if (index % 10 === 0) process.stdout.write('.');
        }

        console.log(`\n✅ Database Seeded Successfully!`);
        console.log(`   - Seeded ${processed} students.`);

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
