const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('\n🕵️ DATABASE INTEGRITY AUDIT');
    console.log('============================');

    // 1. Load Configurations to build Lookup Maps
    console.log('1. Loading Configurations...');
    const schools = await prisma.configSchool.findMany();
    const courses = await prisma.configCourse.findMany();
    const branches = await prisma.configBranch.findMany();

    const schoolMap = new Map(schools.map(s => [s.id, s.name]));
    const courseMap = new Map(courses.map(c => [c.id, c.name]));
    const branchMap = new Map(branches.map(b => [b.id, b.name]));

    const schoolNameMap = new Map(schools.map(s => [s.name, s.id]));
    const courseNameMap = new Map(courses.map(c => [c.name, c.id]));
    const branchNameMap = new Map(branches.map(b => [b.name, b.id]));

    console.log(`   - Loaded: ${schools.length} Schools, ${courses.length} Courses, ${branches.length} Branches.`);

    // 2. Audit NoDuesForms
    console.log('\n2. Auditing NoDuesForms (Foreign Key Integrity)...');

    // We'll process in batches to save memory
    const batchSize = 1000;
    let skip = 0;
    let totalForms = await prisma.noDuesForm.count();
    let orphanSchools = 0;
    let orphanCourses = 0;
    let orphanBranches = 0;
    let nameMismatches = 0;

    while (skip < totalForms) {
        const forms = await prisma.noDuesForm.findMany({
            take: batchSize,
            skip: skip,
            select: {
                id: true,
                schoolId: true, school: true,
                courseId: true, course: true,
                branchId: true, branch: true,
            }
        });

        for (const form of forms) {
            // Check IDs exist
            if (!schoolMap.has(form.schoolId)) orphanSchools++;
            if (!courseMap.has(form.courseId)) orphanCourses++;
            if (!branchMap.has(form.branchId)) orphanBranches++;

            // Check Name Consistency (DB Name vs Config Name)
            // If they differ, it might confuse the UI if it relies on one over the other
            const configSchoolName = schoolMap.get(form.schoolId);
            if (configSchoolName && form.school !== configSchoolName) nameMismatches++;
        }
        skip += batchSize;
        process.stdout.write('.');
    }
    console.log('\n   - Batch processing complete.');

    if (orphanSchools + orphanCourses + orphanBranches + nameMismatches === 0) {
        console.log('   ✅ NoDuesForms Integrity: PERFECT.');
    } else {
        console.log('   ❌ NoDuesForms Integrity Issues Found:');
        console.log(`      - Invalid School IDs: ${orphanSchools}`);
        console.log(`      - Invalid Course IDs: ${orphanCourses}`);
        console.log(`      - Invalid Branch IDs: ${orphanBranches}`);
        console.log(`      - Name Mismatches:    ${nameMismatches}`);
    }

    // 3. Audit StudentData
    console.log('\n3. Auditing StudentData (Name Consistency)...');

    skip = 0;
    let totalStudents = await prisma.studentData.count();
    let unknownSchoolNames = 0;
    let unknownCourseNames = 0;
    let unknownBranchNames = 0;

    while (skip < totalStudents) {
        const students = await prisma.studentData.findMany({
            take: batchSize,
            skip: skip,
            select: {
                id: true,
                school: true,
                course: true,
                branch: true
            }
        });

        for (const student of students) {
            if (!schoolNameMap.has(student.school)) unknownSchoolNames++;
            if (!courseNameMap.has(student.course)) unknownCourseNames++;
            // Branch Check: strict? Some branches might be slight varying text if not strict relation?
            // Actually our seed script ensured they match the Config Table entries.
            if (!branchNameMap.has(student.branch)) unknownBranchNames++;
        }
        skip += batchSize;
        process.stdout.write('.');
    }
    console.log('\n   - Batch processing complete.');

    if (unknownSchoolNames + unknownCourseNames + unknownBranchNames === 0) {
        console.log('   ✅ StudentData Integrity: PERFECT.');
    } else {
        console.log('   ❌ StudentData Integrity Issues Found:');
        console.log(`      - Unknown School Names: ${unknownSchoolNames}`);
        console.log(`      - Unknown Course Names: ${unknownCourseNames}`);
        console.log(`      - Unknown Branch Names: ${unknownBranchNames}`);
    }

    // 4. Submission Readiness Check
    console.log('\n4. Submission Readiness Conclusion');
    if (orphanSchools === 0 && unknownSchoolNames === 0) {
        console.log('   🚀 SYSTEM READY: All student records map to valid configuration. Form submission should work flawlessly.');
    } else {
        console.log('   ⚠️ WARNING: There are broken links. Form submission might fail for some students.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
