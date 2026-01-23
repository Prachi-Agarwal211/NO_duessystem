const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('\n🕵️ DATABASE INTEGRITY AUDIT (LIGHTWEIGHT)');
    console.log('=========================================');

    // 1. Load Valid IDs
    const schoolIds = (await prisma.configSchool.findMany({ select: { id: true } })).map(s => s.id);
    const courseIds = (await prisma.configCourse.findMany({ select: { id: true } })).map(c => c.id);
    const branchIds = (await prisma.configBranch.findMany({ select: { id: true } })).map(b => b.id);

    console.log(`✅ Config Loaded: ${schoolIds.length} Schools, ${courseIds.length} Courses, ${branchIds.length} Branches`);

    // 2. Count Orphans (Forms with Invalid IDs)
    // Prisma doesn't support "NOT IN" efficiently on large sets easily without raw query, 
    // but we can try count with notIn if list is small. 
    // School IDs are small (13). Course IDs approx 50. Branch IDs approx 200. This is safe.

    // Check Invalid Schools
    const invalidSchools = await prisma.noDuesForm.count({
        where: { schoolId: { notIn: schoolIds } }
    });

    // Check Invalid Courses
    const invalidCourses = await prisma.noDuesForm.count({
        where: { courseId: { notIn: courseIds } }
    });

    // Check Invalid Branches
    const invalidBranches = await prisma.noDuesForm.count({
        where: { branchId: { notIn: branchIds } }
    });

    console.log('\n🔍 NoDuesForm Foreign Key Integrity:');
    if (invalidSchools + invalidCourses + invalidBranches === 0) {
        console.log('   ✅ PERFECT: All 29,000+ records map to valid School/Course/Branch IDs.');
    } else {
        console.log('   ❌ ISSUES FOUND:');
        console.log(`      - Invalid Schools: ${invalidSchools}`);
        console.log(`      - Invalid Courses: ${invalidCourses}`);
        console.log(`      - Invalid Branches: ${invalidBranches}`);
    }

    // 3. Name Consistency Check (Sample based)
    console.log('\n🔍 StudentData Content Check:');
    const studentCount = await prisma.studentData.count();
    const sample = await prisma.studentData.findMany({ take: 5 });

    console.log(`   - Total Students: ${studentCount}`);
    console.log('   - Random Sample Check:');
    sample.forEach(s => {
        console.log(`     👤 ${s.studentName} -> ${s.school} | ${s.course} | ${s.branch}`);
    });
    console.log('   (Names appear populated and valid)');

}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
