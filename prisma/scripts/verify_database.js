const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^"|"$/g, '');
        }
    });
    console.log('✅ Loaded .env.local\n');
} else {
    console.error('❌ .env.local not found');
    process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 COMPREHENSIVE DATABASE & RPC VERIFICATION\n');
    console.log('='.repeat(60) + '\n');

    let results = [];

    // ============================================================================
    // 1. TABLE COUNTS
    // ============================================================================
    console.log('📊 1. TABLE COUNTS\n');

    try {
        const tables = [
            { name: 'no_dues_forms', model: 'noDuesForm' },
            { name: 'student_data', model: 'studentData' },
            { name: 'config_schools', model: 'configSchool' },
            { name: 'config_courses', model: 'configCourse' },
            { name: 'config_branches', model: 'configBranch' },
            { name: 'departments', model: 'department' },
            { name: 'profiles', model: 'profile' },
            { name: 'no_dues_status', model: 'noDuesStatus' }
        ];

        for (const table of tables) {
            try {
                const count = await prisma[table.model].count();
                console.log(`   ✅ ${table.name}: ${count} records`);
                results.push({ test: `Table: ${table.name}`, status: 'PASS', count });
            } catch (e) {
                console.log(`   ❌ ${table.name}: ERROR - ${e.message}`);
                results.push({ test: `Table: ${table.name}`, status: 'FAIL', error: e.message });
            }
        }
    } catch (e) {
        console.log('   ❌ Table counts failed:', e.message);
    }

    // ============================================================================
    // 2. RPC FUNCTION TESTS
    // ============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('\n📡 2. RPC FUNCTION TESTS\n');

    // Test search_student_data
    try {
        const searchResult = await prisma.$queryRaw`SELECT * FROM search_student_data('JU') LIMIT 3`;
        console.log(`   ✅ search_student_data: Working (${searchResult.length} results for 'JU')`);
        results.push({ test: 'RPC: search_student_data', status: 'PASS', count: searchResult.length });
    } catch (e) {
        console.log(`   ❌ search_student_data: FAILED - ${e.message}`);
        results.push({ test: 'RPC: search_student_data', status: 'FAIL', error: e.message });
    }

    // Test get_student_by_regno
    try {
        // Get a sample registration number first
        const sample = await prisma.studentData.findFirst({ select: { registrationNo: true } });
        if (sample) {
            const getResult = await prisma.$queryRaw`SELECT * FROM get_student_by_regno(${sample.registrationNo})`;
            console.log(`   ✅ get_student_by_regno: Working (found ${getResult.length} for '${sample.registrationNo}')`);
            results.push({ test: 'RPC: get_student_by_regno', status: 'PASS', count: getResult.length });
        } else {
            console.log(`   ⚠️ get_student_by_regno: No sample data to test`);
            results.push({ test: 'RPC: get_student_by_regno', status: 'SKIP', reason: 'No sample data' });
        }
    } catch (e) {
        console.log(`   ❌ get_student_by_regno: FAILED - ${e.message}`);
        results.push({ test: 'RPC: get_student_by_regno', status: 'FAIL', error: e.message });
    }

    // Test get_form_statistics
    try {
        const statsResult = await prisma.$queryRaw`SELECT * FROM get_form_statistics()`;
        console.log(`   ✅ get_form_statistics: Working`);
        if (statsResult[0]) {
            console.log(`      Total: ${statsResult[0].total_applications}, Pending: ${statsResult[0].pending_applications}, Approved: ${statsResult[0].approved_applications}`);
        }
        results.push({ test: 'RPC: get_form_statistics', status: 'PASS', data: statsResult[0] });
    } catch (e) {
        console.log(`   ❌ get_form_statistics: FAILED - ${e.message}`);
        results.push({ test: 'RPC: get_form_statistics', status: 'FAIL', error: e.message });
    }

    // Test get_department_workload
    try {
        const workloadResult = await prisma.$queryRaw`SELECT * FROM get_department_workload()`;
        console.log(`   ✅ get_department_workload: Working (${workloadResult.length} departments)`);
        results.push({ test: 'RPC: get_department_workload', status: 'PASS', count: workloadResult.length });
    } catch (e) {
        console.log(`   ❌ get_department_workload: FAILED - ${e.message}`);
        results.push({ test: 'RPC: get_department_workload', status: 'FAIL', error: e.message });
    }

    // Test get_staff_performance
    try {
        const sampleStaff = await prisma.profile.findFirst({
            where: { role: 'department' },
            select: { id: true }
        });
        if (sampleStaff) {
            const perfResult = await prisma.$queryRaw`SELECT * FROM get_staff_performance(${sampleStaff.id}::uuid)`;
            console.log(`   ✅ get_staff_performance: Working`);
            results.push({ test: 'RPC: get_staff_performance', status: 'PASS' });
        } else {
            console.log(`   ⚠️ get_staff_performance: No staff profiles to test`);
            results.push({ test: 'RPC: get_staff_performance', status: 'SKIP', reason: 'No staff profiles' });
        }
    } catch (e) {
        console.log(`   ❌ get_staff_performance: FAILED - ${e.message}`);
        results.push({ test: 'RPC: get_staff_performance', status: 'FAIL', error: e.message });
    }

    // Test get_staff_leaderboard
    try {
        const leaderboardResult = await prisma.$queryRaw`SELECT * FROM get_staff_leaderboard('total_actions', 5)`;
        console.log(`   ✅ get_staff_leaderboard: Working (${leaderboardResult.length} staff)`);
        results.push({ test: 'RPC: get_staff_leaderboard', status: 'PASS', count: leaderboardResult.length });
    } catch (e) {
        console.log(`   ❌ get_staff_leaderboard: FAILED - ${e.message}`);
        results.push({ test: 'RPC: get_staff_leaderboard', status: 'FAIL', error: e.message });
    }

    // ============================================================================
    // 3. DATA INTEGRITY CHECKS
    // ============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('\n🔗 3. DATA INTEGRITY CHECKS\n');

    // Check foreign key integrity
    try {
        const orphanSchools = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM no_dues_forms 
      WHERE school_id IS NOT NULL 
      AND school_id NOT IN (SELECT id FROM config_schools)
    `;
        const orphanCount = Number(orphanSchools[0].count);
        if (orphanCount === 0) {
            console.log(`   ✅ School FK integrity: PASS (no orphans)`);
            results.push({ test: 'FK: Schools', status: 'PASS' });
        } else {
            console.log(`   ❌ School FK integrity: FAIL (${orphanCount} orphans)`);
            results.push({ test: 'FK: Schools', status: 'FAIL', orphanCount });
        }
    } catch (e) {
        console.log(`   ⚠️ School FK check skipped: ${e.message}`);
    }

    try {
        const orphanCourses = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM no_dues_forms 
      WHERE course_id IS NOT NULL 
      AND course_id NOT IN (SELECT id FROM config_courses)
    `;
        const orphanCount = Number(orphanCourses[0].count);
        if (orphanCount === 0) {
            console.log(`   ✅ Course FK integrity: PASS (no orphans)`);
            results.push({ test: 'FK: Courses', status: 'PASS' });
        } else {
            console.log(`   ❌ Course FK integrity: FAIL (${orphanCount} orphans)`);
            results.push({ test: 'FK: Courses', status: 'FAIL', orphanCount });
        }
    } catch (e) {
        console.log(`   ⚠️ Course FK check skipped: ${e.message}`);
    }

    try {
        const orphanBranches = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM no_dues_forms 
      WHERE branch_id IS NOT NULL 
      AND branch_id NOT IN (SELECT id FROM config_branches)
    `;
        const orphanCount = Number(orphanBranches[0].count);
        if (orphanCount === 0) {
            console.log(`   ✅ Branch FK integrity: PASS (no orphans)`);
            results.push({ test: 'FK: Branches', status: 'PASS' });
        } else {
            console.log(`   ❌ Branch FK integrity: FAIL (${orphanCount} orphans)`);
            results.push({ test: 'FK: Branches', status: 'FAIL', orphanCount });
        }
    } catch (e) {
        console.log(`   ⚠️ Branch FK check skipped: ${e.message}`);
    }

    // ============================================================================
    // 4. SUMMARY
    // ============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 4. VERIFICATION SUMMARY\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;

    console.log(`   ✅ PASSED:  ${passed}`);
    console.log(`   ❌ FAILED:  ${failed}`);
    console.log(`   ⚠️ SKIPPED: ${skipped}`);
    console.log(`   📊 TOTAL:   ${results.length}`);

    if (failed === 0) {
        console.log('\n   🎉 ALL TESTS PASSED! Database is fully operational.\n');
    } else {
        console.log('\n   ⚠️ Some tests failed. Review the output above.\n');
    }

    // Write results to file - handle BigInt serialization
    const safeResults = JSON.parse(JSON.stringify(results, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
    const reportPath = path.join(__dirname, '../../processed_data/db_verification_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), results: safeResults }, null, 2));
    console.log(`📄 Full report saved to: processed_data/db_verification_report.json\n`);
}

main()
    .catch(e => console.error('Fatal error:', e))
    .finally(() => prisma.$disconnect());
