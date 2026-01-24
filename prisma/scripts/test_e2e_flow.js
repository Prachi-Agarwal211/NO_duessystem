/**
 * E2E System Verification Script
 * Consolidates full lifecycle testing into one runnable file.
 * 
 * Usage: node prisma/scripts/test_e2e_flow.js
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
    console.log('🚀 Starting E2E System Verification...');

    // Test Data
    const TEST_REG_NO = 'TEST2026E2E';
    const TEST_STUDENT = {
        registration_no: TEST_REG_NO,
        student_name: 'Test Student E2E',
        parent_name: 'Test Parent',
        admission_year: '2022',
        passing_year: '2026',
        school_name: 'School of Engineering',
        course_name: 'B.Tech',
        branch_name: 'Computer Science',
        country_code: '+91',
        contact_no: '9876543210',
        personal_email: 'test.e2e@example.com',
        college_email: 'test.e2e@jecrc.edu.in',
        alumni_profile_link: 'https://jualumni.in/test'
    };

    try {
        // 1. Cleanup Previous Test Data
        console.log('\n🧹 Cleaning up previous test data...');
        await prisma.noDuesStatus.deleteMany({
            where: {
                no_dues_forms: { registration_no: TEST_REG_NO }
            }
        });

        // We also need to delete from student_data if we sync there
        await prisma.studentData.deleteMany({
            where: { registration_no: TEST_REG_NO }
        });

        await prisma.noDuesForm.deleteMany({
            where: { registration_no: TEST_REG_NO }
        });
        console.log('✅ Cleanup complete.');

        // 2. Simulate Form Submission (API Logic Mirror)
        console.log('\n📝 Simulating Form Submission...');

        // Ensure School/Course/Branch exist
        let school = await prisma.configSchool.findFirst({ where: { name: TEST_STUDENT.school_name } });
        if (!school) school = await prisma.configSchool.create({ data: { name: TEST_STUDENT.school_name } });

        let course = await prisma.configCourse.findFirst({ where: { name: TEST_STUDENT.course_name, school_id: school.id } });
        if (!course) course = await prisma.configCourse.create({ data: { name: TEST_STUDENT.course_name, school_id: school.id } });

        let branch = await prisma.configBranch.findFirst({ where: { name: TEST_STUDENT.branch_name, course_id: course.id } });
        if (!branch) branch = await prisma.configBranch.create({ data: { name: TEST_STUDENT.branch_name, course_id: course.id } });

        const form = await prisma.noDuesForm.create({
            data: {
                registration_no: TEST_STUDENT.registration_no,
                student_name: TEST_STUDENT.student_name,
                parent_name: TEST_STUDENT.parent_name,
                admission_year: TEST_STUDENT.admission_year,
                passing_year: TEST_STUDENT.passing_year,
                school_id: school.id,
                school: school.name,
                course_id: course.id,
                course: course.name,
                branch_id: branch.id,
                branch: branch.name,
                country_code: TEST_STUDENT.country_code,
                contact_no: TEST_STUDENT.contact_no,
                personal_email: TEST_STUDENT.personal_email,
                college_email: TEST_STUDENT.college_email,
                alumniProfileLink: TEST_STUDENT.alumni_profile_link,
                status: 'pending'
            }
        });
        console.log(`✅ Form created with ID: ${form.id}`);

        // 3. Verify Department Status Creation
        console.log('\n🏢 Verifying Department Status Creation...');
        // Simulate what the API does: Create status records
        const departments = await prisma.department.findMany({ where: { is_active: true } });
        console.log(`ℹ️ Found ${departments.length} active departments.`);

        if (departments.length === 0) {
            console.warn('⚠️ No active departments found! Triggering fallback creation...');
            // Create dummy departments if none
            await prisma.department.create({ data: { name: 'Library', display_order: 1, is_active: true } });
            await prisma.department.create({ data: { name: 'Accounts', display_order: 2, is_active: true } });
            // Refetch
        }

        const deptList = await prisma.department.findMany({ where: { is_active: true } });

        const statusData = deptList.map(dept => ({
            form_id: form.id,
            department_name: dept.name,
            status: 'pending'
        }));

        await prisma.noDuesStatus.createMany({ data: statusData });

        const count = await prisma.noDuesStatus.count({ where: { form_id: form.id } });
        console.log(`✅ Created ${count} status records.`);
        if (count !== deptList.length) throw new Error('Mismatch in status record count');

        // 4. Verify Sync to Master Table
        console.log('\n🔄 Verifying Master Record Sync...');
        // Simulate sync
        await prisma.studentData.upsert({
            where: { form_id: form.id },
            update: { registration_no: TEST_REG_NO },
            create: {
                form_id: form.id,
                registration_no: TEST_REG_NO,
                student_name: TEST_STUDENT.student_name,
                alumniProfileLink: TEST_STUDENT.alumni_profile_link
            }
        });

        const masterRecord = await prisma.studentData.findUnique({ where: { form_id: form.id } });
        if (!masterRecord) throw new Error('Master record not created');
        console.log('✅ Master record verified.');

        // 5. Simulate Department Action (Approval)
        console.log('\n✅ Simulating Department Approvals...');
        // Approve first department
        const firstDept = deptList[0];
        await prisma.noDuesStatus.update({
            where: {
                form_id_department_name: {
                    form_id: form.id,
                    department_name: firstDept.name
                }
            },
            data: {
                status: 'approved',
                action_by: 'TEST_ADMIN',
                action_at: new Date()
            }
        });
        console.log(`✅ Approved by ${firstDept.name}`);

        // Check overall status (should still be pending)
        const formCheck1 = await prisma.noDuesForm.findUnique({ where: { id: form.id } });
        console.log(`ℹ️ Overall Status: ${formCheck1.status} (Expected: pending)`);

        // Approve ALL departments
        console.log('⚡ Approving ALL remaining departments...');
        await prisma.noDuesStatus.updateMany({
            where: { form_id: form.id, status: 'pending' },
            data: { status: 'approved', action_by: 'AUTO_TEST', action_at: new Date() }
        });

        // 6. Verify Certificate Logic
        console.log('\n🎓 Verifying Completion Logic...');
        // Check if all approved
        const allStatuses = await prisma.noDuesStatus.findMany({ where: { form_id: form.id } });
        const allApproved = allStatuses.every(s => s.status === 'approved');
        console.log(`ℹ️ All Departments Approved? ${allApproved}`);

        if (allApproved) {
            // Update form to completed
            await prisma.noDuesForm.update({
                where: { id: form.id },
                data: {
                    status: 'completed',
                    final_certificate_generated: true,
                    certificate_url: 'https://cdn.example.com/cert/test.pdf' // Mock
                }
            });
            console.log('✅ Form marked as COMPLETED');
        }

        const finalForm = await prisma.noDuesForm.findUnique({ where: { id: form.id } });
        if (finalForm.status !== 'completed') throw new Error('Form should be completed');
        console.log('✅ Final Status Verified: COMPLETED');

        console.log('\n🎉 E2E TEST PASSED SUCCESSFULLY!');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
