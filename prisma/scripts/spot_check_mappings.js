const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('\n🔍 MAPPING INTEGRITY SPOT CHECK (FULL SCAN)');
    console.log('==========================================');

    // Define danger keywords we want to verify
    const keywords = [
        'Kalvium',          // Engineering Edge Case
        'Gurukul',          // Design Edge Case
        'Construction',     // M.Tech Edge Case
        'CollegeDekho',     // BCA/BBA Edge Case
        'ISDC',             // Commerce/Management Edge Case
        'Visual Arts',      // New Course Edge Case
        'Clinical'          // M.Sc Edge Case
    ];

    // Fetch ALL forms
    const allForms = await prisma.noDuesForm.findMany({
        select: {
            studentName: true,
            registrationNo: true,
            school: true,
            course: true,
            branch: true
        }
    });

    console.log(`Loaded ${allForms.length} records for scanning...`);

    for (const keyword of keywords) {
        const match = allForms.find(f =>
            (f.branch && f.branch.toLowerCase().includes(keyword.toLowerCase())) ||
            (f.course && f.course.toLowerCase().includes(keyword.toLowerCase()))
        );

        if (match) {
            console.log(`\n✅ Verified Group: "${keyword}"`);
            console.log(`   👤 Student: ${match.studentName} (${match.registrationNo})`);
            console.log(`   🏫 School:  ${match.school}`);
            console.log(`   🎓 Course:  ${match.course}`);
            console.log(`   🌿 Branch:  ${match.branch}`);
        } else {
            console.log(`\n❌ Could not find sample for: "${keyword}" (Scanned ${allForms.length})`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
