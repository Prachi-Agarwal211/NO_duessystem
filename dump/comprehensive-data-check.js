/**
 * Comprehensive Data Integrity Check
 * 
 * This script performs thorough checks for:
 * 1. Duplicate branch names within the same course
 * 2. Duplicate course names within the same school
 * 3. Duplicate school names
 * 4. Orphaned records (courses/branches without valid parents)
 * 5. Display order issues
 * 6. Invalid or empty names
 * 
 * Usage: node scripts/comprehensive-data-check.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function runComprehensiveCheck() {
    console.log('\n' + '='.repeat(80));
    console.log('           COMPREHENSIVE DATA INTEGRITY CHECK');
    console.log('='.repeat(80) + '\n');

    const issues = [];
    const stats = {
        schools: 0,
        courses: 0,
        branches: 0
    };

    try {
        // =============================================
        // STEP 1: Fetch all data
        // =============================================
        console.log('📥 Fetching all data...\n');

        const { data: schools, error: schoolErr } = await supabase
            .from('config_schools')
            .select('*')
            .order('display_order');
        if (schoolErr) throw schoolErr;
        stats.schools = schools.length;

        const { data: courses, error: courseErr } = await supabase
            .from('config_courses')
            .select('*')
            .order('display_order');
        if (courseErr) throw courseErr;
        stats.courses = courses.length;

        const { data: branches, error: branchErr } = await supabase
            .from('config_branches')
            .select('*')
            .order('display_order');
        if (branchErr) throw branchErr;
        stats.branches = branches.length;

        console.log(`   Schools: ${stats.schools}`);
        console.log(`   Courses: ${stats.courses}`);
        console.log(`   Branches: ${stats.branches}\n`);

        // =============================================
        // STEP 2: Check for duplicate school names
        // =============================================
        console.log('🔍 Checking for duplicate school names...');
        const schoolNames = new Map();
        for (const school of schools) {
            const name = school.name?.trim().toLowerCase();
            if (!name) {
                issues.push({ type: 'EMPTY_NAME', entity: 'school', id: school.id, name: school.name });
                continue;
            }
            if (schoolNames.has(name)) {
                issues.push({
                    type: 'DUPLICATE_SCHOOL',
                    name: school.name,
                    ids: [schoolNames.get(name), school.id]
                });
            } else {
                schoolNames.set(name, school.id);
            }
        }
        console.log('   ✅ Done\n');

        // =============================================
        // STEP 3: Check for duplicate course names within same school
        // =============================================
        console.log('🔍 Checking for duplicate courses within schools...');
        const schoolCourseMap = new Map();
        for (const course of courses) {
            const key = `${course.school_id}:${course.name?.trim().toLowerCase()}`;
            if (!course.name?.trim()) {
                issues.push({ type: 'EMPTY_NAME', entity: 'course', id: course.id, name: course.name });
                continue;
            }
            if (schoolCourseMap.has(key)) {
                const school = schools.find(s => s.id === course.school_id);
                issues.push({
                    type: 'DUPLICATE_COURSE',
                    school: school?.name,
                    course: course.name,
                    ids: [schoolCourseMap.get(key), course.id]
                });
            } else {
                schoolCourseMap.set(key, course.id);
            }
        }
        console.log('   ✅ Done\n');

        // =============================================
        // STEP 4: Check for duplicate branch names within same course
        // =============================================
        console.log('🔍 Checking for duplicate branches within courses...');
        const courseBranchMap = new Map();
        for (const branch of branches) {
            const key = `${branch.course_id}:${branch.name?.trim().toLowerCase()}`;
            if (!branch.name?.trim()) {
                issues.push({ type: 'EMPTY_NAME', entity: 'branch', id: branch.id, name: branch.name });
                continue;
            }
            if (courseBranchMap.has(key)) {
                const course = courses.find(c => c.id === branch.course_id);
                const school = schools.find(s => s.id === course?.school_id);
                issues.push({
                    type: 'DUPLICATE_BRANCH',
                    school: school?.name,
                    course: course?.name,
                    branch: branch.name,
                    ids: [courseBranchMap.get(key), branch.id]
                });
            } else {
                courseBranchMap.set(key, branch.id);
            }
        }
        console.log('   ✅ Done\n');

        // =============================================
        // STEP 5: Check for orphaned courses
        // =============================================
        console.log('🔍 Checking for orphaned courses...');
        const schoolIds = new Set(schools.map(s => s.id));
        for (const course of courses) {
            if (!schoolIds.has(course.school_id)) {
                issues.push({
                    type: 'ORPHANED_COURSE',
                    course: course.name,
                    courseId: course.id,
                    missingSchoolId: course.school_id
                });
            }
        }
        console.log('   ✅ Done\n');

        // =============================================
        // STEP 6: Check for orphaned branches
        // =============================================
        console.log('🔍 Checking for orphaned branches...');
        const courseIds = new Set(courses.map(c => c.id));
        for (const branch of branches) {
            if (!courseIds.has(branch.course_id)) {
                issues.push({
                    type: 'ORPHANED_BRANCH',
                    branch: branch.name,
                    branchId: branch.id,
                    missingCourseId: branch.course_id
                });
            }
        }
        console.log('   ✅ Done\n');

        // =============================================
        // STEP 7: Check display order issues
        // =============================================
        console.log('🔍 Checking display order consistency...');

        // Check school display orders
        const schoolOrders = schools.map(s => s.display_order);
        const uniqueSchoolOrders = new Set(schoolOrders);
        if (uniqueSchoolOrders.size !== schoolOrders.length) {
            issues.push({
                type: 'DISPLAY_ORDER_CONFLICT',
                entity: 'schools',
                detail: 'Duplicate display_order values found'
            });
        }

        // Check course display orders per school
        for (const school of schools) {
            const schoolCourses = courses.filter(c => c.school_id === school.id);
            const orders = schoolCourses.map(c => c.display_order);
            const uniqueOrders = new Set(orders);
            if (uniqueOrders.size !== orders.length) {
                issues.push({
                    type: 'DISPLAY_ORDER_CONFLICT',
                    entity: 'courses',
                    school: school.name,
                    detail: 'Duplicate display_order values found'
                });
            }
        }

        // Check branch display orders per course
        for (const course of courses) {
            const courseBranches = branches.filter(b => b.course_id === course.id);
            const orders = courseBranches.map(b => b.display_order);
            const uniqueOrders = new Set(orders);
            if (uniqueOrders.size !== orders.length) {
                const school = schools.find(s => s.id === course.school_id);
                issues.push({
                    type: 'DISPLAY_ORDER_CONFLICT',
                    entity: 'branches',
                    school: school?.name,
                    course: course.name,
                    detail: 'Duplicate display_order values found'
                });
            }
        }
        console.log('   ✅ Done\n');

        // =============================================
        // RESULTS
        // =============================================
        console.log('='.repeat(80));
        console.log('                           RESULTS');
        console.log('='.repeat(80) + '\n');

        if (issues.length === 0) {
            console.log('✅ ALL CHECKS PASSED! No issues found.\n');
            console.log('   Data Summary:');
            console.log(`   - ${stats.schools} Schools (all unique, properly linked)`);
            console.log(`   - ${stats.courses} Courses (all unique within schools, properly linked)`);
            console.log(`   - ${stats.branches} Branches (all unique within courses, properly linked)`);
            console.log('\n   Your data structure is clean and ready to use!\n');
        } else {
            console.log(`❌ FOUND ${issues.length} ISSUE(S):\n`);

            issues.forEach((issue, idx) => {
                console.log(`\n${idx + 1}. [${issue.type}]`);
                switch (issue.type) {
                    case 'DUPLICATE_SCHOOL':
                        console.log(`   School: "${issue.name}"`);
                        console.log(`   IDs: ${issue.ids.join(', ')}`);
                        break;
                    case 'DUPLICATE_COURSE':
                        console.log(`   School: ${issue.school}`);
                        console.log(`   Course: "${issue.course}"`);
                        console.log(`   IDs: ${issue.ids.join(', ')}`);
                        break;
                    case 'DUPLICATE_BRANCH':
                        console.log(`   School: ${issue.school}`);
                        console.log(`   Course: ${issue.course}`);
                        console.log(`   Branch: "${issue.branch}"`);
                        console.log(`   IDs: ${issue.ids.join(', ')}`);
                        break;
                    case 'ORPHANED_COURSE':
                        console.log(`   Course: "${issue.course}" (ID: ${issue.courseId})`);
                        console.log(`   Missing School ID: ${issue.missingSchoolId}`);
                        break;
                    case 'ORPHANED_BRANCH':
                        console.log(`   Branch: "${issue.branch}" (ID: ${issue.branchId})`);
                        console.log(`   Missing Course ID: ${issue.missingCourseId}`);
                        break;
                    case 'EMPTY_NAME':
                        console.log(`   Entity: ${issue.entity} (ID: ${issue.id})`);
                        console.log(`   Name is empty or null`);
                        break;
                    case 'DISPLAY_ORDER_CONFLICT':
                        console.log(`   Entity: ${issue.entity}`);
                        if (issue.school) console.log(`   School: ${issue.school}`);
                        if (issue.course) console.log(`   Course: ${issue.course}`);
                        console.log(`   Detail: ${issue.detail}`);
                        break;
                }
            });

            console.log('\n\n💡 RECOMMENDED ACTIONS:');
            console.log('   - For duplicates: Delete one of the duplicate records');
            console.log('   - For orphaned records: Either delete them or fix the parent reference');
            console.log('   - For display order conflicts: Update display_order values to be unique');
        }

        console.log('\n' + '='.repeat(80) + '\n');

        return { success: issues.length === 0, issues, stats };

    } catch (error) {
        console.error('\n❌ Error during check:', error.message);
        console.error('Stack trace:', error.stack);
        return { success: false, error: error.message };
    }
}

// Run the check
runComprehensiveCheck()
    .then(result => {
        if (result.success) {
            console.log('✅ Comprehensive check completed successfully!\n');
            process.exit(0);
        } else if (result.issues && result.issues.length > 0) {
            console.log(`⚠️ Check completed with ${result.issues.length} issue(s) found.\n`);
            process.exit(1);
        } else {
            console.log('❌ Check failed with error.\n');
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
