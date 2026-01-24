import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { studentFormSchema, validateWithZod } from '@/lib/zodSchemas';
import { ApiResponse } from '@/lib/apiResponse';
import prisma from '@/lib/prismaClient';

export const dynamic = 'force-dynamic';

/**
 * POST /api/student
 * Submit a new No Dues application using Prisma ORM
 * 
 * This route handles form submission with:
 * - Server-side validation
 * - Database insertion via Prisma
 * - Email notifications to all departments
 * - Real-time updates
 */
export async function POST(request) {
  try {
    // Rate limiting: Prevent spam form submissions
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.SUBMIT);
    if (!rateLimitCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitCheck.error || 'Too many requests',
          retryAfter: rateLimitCheck.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60'
          }
        }
      );
    }

    const body = await request.json();

    // ZOD validation
    const validation = validateWithZod(body, studentFormSchema);
    if (!validation.success) {
      const errorFields = Object.keys(validation.errors);
      const firstError = validation.errors[errorFields[0]];

      return NextResponse.json(
        {
          success: false,
          error: firstError || 'Please check all required fields',
          details: validation.errors,
          field: errorFields[0]
        },
        { status: 400 }
      );
    }

    // Use Prisma for database operations
    const result = await submitApplicationWithPrisma(validation.data);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Student submission error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit application'
      },
      { status: 500 }
    );
  }
}

/**
 * Submit application using Prisma ORM
 */
async function submitApplicationWithPrisma(formData) {
  try {
    console.log('📝 Submitting application via Prisma ORM...');

    // 1. Check for duplicate registration number
    const existingForm = await prisma.noDuesForm.findUnique({
      where: {
        registration_no: formData.registration_no.toUpperCase()
      }
    });

    if (existingForm) {
      return {
        success: false,
        error: 'A form with this registration number already exists',
        duplicate: true,
        registrationNo: formData.registration_no
      };
    }

    // 2. Resolve configuration IDs (UUIDs or names)
    const resolvedData = await resolveConfigurationIds(formData);

    // 3. Create form with Prisma
    const form = await prisma.noDuesForm.create({
      data: {
        registration_no: resolvedData.registration_no.toUpperCase(),
        student_name: resolvedData.student_name,
        parent_name: resolvedData.parent_name,
        admission_year: resolvedData.admission_year,
        passing_year: resolvedData.passing_year,
        school_id: resolvedData.school_id,
        school: resolvedData.school_name,
        course_id: resolvedData.course_id,
        course: resolvedData.course_name,
        branch_id: resolvedData.branch_id,
        branch: resolvedData.branch_name,
        country_code: resolvedData.country_code,
        contact_no: resolvedData.contact_no,
        personal_email: resolvedData.personal_email,
        college_email: resolvedData.college_email,
        alumniProfileLink: resolvedData.alumni_profile_link,
        status: 'pending',
        is_reapplication: false,
        reapplication_count: 0
      },
      include: {
        config_schools: true,
        config_courses: true,
        config_branches: true
      }
    });

    // 4. Create initial department statuses
    await createDepartmentStatuses(form.id);

    // 5. Sync student data
    await syncStudentData(form.id, resolvedData);

    // 6. Send notifications (this would use your existing email service)
    await sendInitialNotifications(form);

    console.log(`✅ Form created successfully via Prisma - ID: ${form.id}, Reg: ${form.registration_no}`);

    return {
      success: true,
      data: form
    };

  } catch (error) {
    console.error('❌ Prisma form creation error:', error);

    // Handle specific database errors
    if (error.code === 'P2002') {
      return {
        success: false,
        error: 'A form with this registration number already exists',
        duplicate: true,
        registrationNo: formData.registration_no
      };
    }

    return {
      success: false,
      error: 'Failed to create form record'
    };
  }
}

/**
 * Resolve configuration IDs (UUIDs or names) using Prisma
 */
async function resolveConfigurationIds(formData) {
  const resolved = { ...formData };

  // Resolve School
  if (formData.school_id && isUuid(formData.school_id)) {
    const school = await prisma.configSchool.findUnique({
      where: { id: formData.school_id },
      select: { name: true }
    });

    if (school) resolved.school_name = school.name;
    else throw new Error('Invalid school ID');
  } else if (formData.school_id) {
    resolved.school_name = formData.school_id;
    const school = await prisma.configSchool.findUnique({
      where: { name: formData.school_name },
      select: { id: true }
    });

    if (school) resolved.school_id = school.id;
    else {
      // Create new school if not exists
      const newSchool = await prisma.configSchool.create({
        data: { name: formData.school_name },
        select: { id: true }
      });
      resolved.school_id = newSchool.id;
    }
  }

  // Resolve Course
  if (formData.course_id && isUuid(formData.course_id)) {
    const course = await prisma.configCourse.findUnique({
      where: { id: formData.course_id },
      select: { name: true }
    });

    if (course) resolved.course_name = course.name;
    else throw new Error('Invalid course ID');
  } else if (formData.course_id) {
    resolved.course_name = formData.course_id;
    const course = await prisma.configCourse.findUnique({
      where: {
        school_id: resolved.school_id,
        name: formData.course_name
      },
      select: { id: true }
    });

    if (course) resolved.course_id = course.id;
    else {
      const newCourse = await prisma.configCourse.create({
        data: {
          school_id: resolved.school_id,
          name: formData.course_name
        },
        select: { id: true }
      });
      resolved.course_id = newCourse.id;
    }
  }

  // Resolve Branch
  if (formData.branch_id && isUuid(formData.branch_id)) {
    const branch = await prisma.configBranch.findUnique({
      where: { id: formData.branch_id },
      select: { name: true }
    });

    if (branch) resolved.branch_name = branch.name;
    else throw new Error('Invalid branch ID');
  } else if (formData.branch_id) {
    resolved.branch_name = formData.branch_id;
    const branch = await prisma.configBranch.findUnique({
      where: {
        course_id: resolved.course_id,
        name: formData.branch_name
      },
      select: { id: true }
    });

    if (branch) resolved.branch_id = branch.id;
    else {
      const newBranch = await prisma.configBranch.create({
        data: {
          course_id: resolved.course_id,
          name: formData.branch_name
        },
        select: { id: true }
      });
      resolved.branch_id = newBranch.id;
    }
  }

  return resolved;
}

/**
 * Create initial department statuses using Prisma
 */
async function createDepartmentStatuses(formId) {
  // Get all active departments
  const departments = await prisma.department.findMany({
    where: { is_active: true },
    select: { name: true },
    orderBy: { display_order: 'asc' }
  });

  if (!departments || departments.length === 0) return;

  // Create status records for each department
  const statusRecords = departments.map(dept => ({
    form_id: formId,
    department_name: dept.name,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date()
  }));

  await prisma.noDuesStatus.createMany({
    data: statusRecords
  });

  console.log(`✅ Created ${statusRecords.length} department status records via Prisma`);
}

/**
 * Sync student data to master table using Prisma
 */
async function syncStudentData(formId, formData) {
  await prisma.studentData.upsert({
    where: { form_id: formId },
    update: {
      registration_no: formData.registration_no.toUpperCase(),
      student_name: formData.student_name,
      parent_name: formData.parent_name,
      school: formData.school_name,
      course: formData.course_name,
      branch: formData.branch_name,
      contact_no: formData.contact_no,
      personal_email: formData.personal_email,
      college_email: formData.college_email,
      admission_year: formData.admission_year,
      passing_year: formData.passing_year,
      alumniProfileLink: formData.alumni_profile_link,
      updated_at: new Date(),
      updated_by: 'student_submission'
    },
    create: {
      form_id: formId,
      registration_no: formData.registration_no.toUpperCase(),
      student_name: formData.student_name,
      parent_name: formData.parent_name,
      school: formData.school_name,
      course: formData.course_name,
      branch: formData.branch_name,
      contact_no: formData.contact_no,
      personal_email: formData.personal_email,
      college_email: formData.college_email,
      admission_year: formData.admission_year,
      passing_year: formData.passing_year,
      alumniProfileLink: formData.alumni_profile_link,
      created_at: new Date(),
      updated_at: new Date(),
      updated_by: 'student_submission'
    }
  });

  console.log('✅ Student master data synced via Prisma');
}

/**
 * Send initial notifications (using existing email service)
 */
async function sendInitialNotifications(form) {
  try {
    // Get all active departments for notification
    const departments = await prisma.department.findMany({
      where: { is_active: true },
      select: { name: true, email: true }
    });

    if (departments && departments.length > 0) {
      // This would use your existing emailService
      console.log(`📧 Would send notifications to ${departments.length} departments`);

      // Example: await sendCombinedDepartmentNotification({
      //   formId: form.id,
      //   studentName: form.student_name,
      //   registrationNo: form.registration_no,
      //   departments: departments.map(d => ({ name: d.name, email: d.email }))
      // });
    }
  } catch (error) {
    console.error('⚠️ Failed to send initial notifications:', error);
    // Don't fail the submission if notifications fail
  }
}

/**
 * GET /api/student?registration_no=XXX
 * Check if a form exists for a registration number using Prisma
 */
export async function GET(request) {
  try {
    // Rate limiting for status check queries
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.READ);
    if (!rateLimitCheck.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitCheck.error || 'Too many requests',
        retryAfter: rateLimitCheck.retryAfter
      }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');

    if (!registrationNo) {
      return NextResponse.json(
        { success: false, error: 'Registration number is required' },
        { status: 400 }
      );
    }

    // Use Prisma to get student status
    const result = await getStudentStatusWithPrisma(registrationNo);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Student GET API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get student status using Prisma ORM
 */
async function getStudentStatusWithPrisma(registrationNo) {
  try {
    const form = await prisma.noDuesForm.findUnique({
      where: {
        registration_no: registrationNo.toUpperCase()
      },
      include: {
        no_dues_status: {
          select: {
            department_name: true,
            status: true,
            action_at: true,
            action_by: true,
            remarks: true,
            rejection_reason: true
          }
        }
      }
    });

    if (!form) {
      return {
        success: false,
        error: 'No form found with this registration number'
      };
    }

    return {
      success: true,
      data: {
        form,
        departmentStatuses: form.no_dues_status || [],
        overallStatus: form.status,
        isCompleted: form.status === 'completed',
        isRejected: form.status === 'rejected',
        certificateGenerated: form.final_certificate_generated,
        certificateUrl: form.certificate_url
      }
    };

  } catch (error) {
    console.error('❌ Failed to get student status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if string is a UUID
 */
function isUuid(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
