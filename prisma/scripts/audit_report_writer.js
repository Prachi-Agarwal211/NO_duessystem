const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Manually load .env
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && !process.env[key.trim()]) {
            process.env[key.trim()] = value.trim().replace(/^"|"$/g, '');
        }
    });
}

const prisma = new PrismaClient();

async function main() {
    process.stdout.write('Starting Audit...\n');
    let output = 'DATABASE INTEGRITY AUDIT REPORT\n===============================\n\n';

    try {
        // 1. Configs
        const schools = await prisma.configSchool.findMany({ select: { id: true, name: true } });
        const courses = await prisma.configCourse.findMany({ select: { id: true, name: true } });
        const branches = await prisma.configBranch.findMany({ select: { id: true, name: true } });

        const schoolIds = new Set(schools.map(s => s.id));
        const courseIds = new Set(courses.map(c => c.id));
        const branchIds = new Set(branches.map(b => b.id));

        output += `1. Configuration Loaded:\n`;
        output += `   - Schools: ${schools.length}\n`;
        output += `   - Courses: ${courses.length}\n`;
        output += `   - Branches: ${branches.length}\n\n`;

        // 2. Scan Forms (Batching logic for safety)
        output += `2. Scanning NoDuesForms for Foreign Key Integrity...\n`;

        let orphanSchools = 0;
        let orphanCourses = 0;
        let orphanBranches = 0;
        let totalForms = 0;

        const batchSize = 5000;
        let cursor = null;

        while (true) {
            const forms = await prisma.noDuesForm.findMany({
                take: batchSize,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                select: { id: true, schoolId: true, courseId: true, branchId: true }
            });

            if (forms.length === 0) break;

            totalForms += forms.length;

            for (const f of forms) {
                if (f.schoolId && !schoolIds.has(f.schoolId)) orphanSchools++;
                if (f.courseId && !courseIds.has(f.courseId)) orphanCourses++;
                if (f.branchId && !branchIds.has(f.branchId)) orphanBranches++;
            }

            cursor = forms[forms.length - 1].id;
            process.stdout.write(`Processed ${totalForms}...\r`);
            if (forms.length < batchSize) break;
        }

        output += `   - Total Forms Scanned: ${totalForms}\n`;
        if (orphanSchools + orphanCourses + orphanBranches === 0) {
            output += `   ✅ RESULT: PERFECT. No broken foreign key links found.\n`;
        } else {
            output += `   ❌ RESULT: INTEGRITY FAILURE.\n`;
            output += `      - Invalid School IDs: ${orphanSchools}\n`;
            output += `      - Invalid Course IDs: ${orphanCourses}\n`;
            output += `      - Invalid Branch IDs: ${orphanBranches}\n`;
        }

        fs.writeFileSync(path.join(__dirname, '../../processed_data/integrity_report.txt'), output);
        console.log('\nReport written to processed_data/integrity_report.txt');

    } catch (e) {
        console.error('Audit crashed:', e);
        fs.writeFileSync(path.join(__dirname, '../../processed_data/integrity_report.txt'), `CRASHED: ${e.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

main();
