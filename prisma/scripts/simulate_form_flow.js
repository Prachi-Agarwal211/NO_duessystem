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
    console.log('\n🚀 SIMULATING FORM SUBMISSION / VIEW FLOW');
    console.log('=========================================');

    // 1. Pick a random Student (simulating login)
    const count = await prisma.studentData.count();
    const skip = Math.floor(Math.random() * count);
    const student = await prisma.studentData.findFirst({ skip: skip });

    if (!student) {
        console.error("❌ No students found to simulate!");
        return;
    }

    console.log(`1. Student Logged In: ${student.studentName} (${student.registrationNo})`);

    // 2. Fetch their No Dues Form (simulating dashboard load)
    // The UI likely queries by registrationNo or userId. Our seed linked them via RegistrationNo logic implicitly but relations are Form->StudentData. 
    // Wait, Schema says StudentData has formId.

    const form = await prisma.noDuesForm.findUnique({
        where: { id: student.formId },
        include: {
            user: true // Profile
        }
    });

    if (!form) {
        console.error("❌ Critical: Student has no associated NoDuesForm!");
        return;
    }
    console.log(`2. Form Loaded: Status = ${form.status}`);

    // 3. Resolve Configuration (The "Submission" check)
    // When submitting, the backend checks if School/Course/Branch are valid.
    // We check if the IDs in the form point to actual config records.

    const school = await prisma.configSchool.findUnique({ where: { id: form.schoolId } });
    const course = await prisma.configCourse.findUnique({ where: { id: form.courseId } });
    const branch = await prisma.configBranch.findUnique({ where: { id: form.branchId } });

    console.log('3. Validating Form Relations...');

    let valid = true;
    if (school) console.log(`   ✅ School Found: ${school.name}`);
    else { console.log(`   ❌ School ID NOT FOUND: ${form.schoolId}`); valid = false; }

    if (course) {
        console.log(`   ✅ Course Found: ${course.name}`);
        // Extended check: Does this Course belong to this School?
        if (course.schoolId !== school.id) {
            console.log(`   ❌ MISMATCH: Course ${course.name} does not belong to School ${school.name}`);
            valid = false;
        }
    } else { console.log(`   ❌ Course ID NOT FOUND: ${form.courseId}`); valid = false; }

    if (branch) {
        console.log(`   ✅ Branch Found: ${branch.name}`);
        // Extended check: Does this Branch belong to this Course?
        if (branch.courseId !== course.id) {
            console.log(`   ❌ MISMATCH: Branch ${branch.name} does not belong to Course ${course.name}`);
            valid = false;
        }
    } else { console.log(`   ❌ Branch ID NOT FOUND: ${form.branchId}`); valid = false; }

    console.log('-----------------------------------------');
    if (valid) {
        console.log('✅ PASS: Form data is fully consistent. Submission flow is safe.');
    } else {
        console.log('❌ FAIL: Data inconsistency detected.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
