import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCombinedDepartmentNotification } from '@/lib/emailService';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { studentFormSchema, validateWithZod } from '@/lib/zodSchemas';
import { APP_URLS } from '@/lib/urlHelper';
import { shouldSendImmediateEmail } from '@/lib/emailNotificationHelper';

// Create Supabase admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/student
 * Submit a new No Dues application
 * 
 * This route handles form submission with:
 * - Server-side validation
 * - Database insertion
 * - Email notifications to all departments
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

    // ==================== ZOD VALIDATION ====================
    // Replaces 200+ lines of manual validation with type-safe Zod schemas
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

    // All data is now validated, sanitized, and transformed by Zod
    const formData = validation.data;

    // ==================== CHECK FOR DUPLICATES ====================
    // registration_no is already uppercase from Zod transformation
    const registrationNo = formData.registration_no;
    
    const { data: existingForm, error: duplicateError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id')
      .eq('registration_no', registrationNo)
      .single();

    if (existingForm) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A form with this registration number already exists',
          duplicate: true,
          registrationNo 
        },
        { status: 409 }
      );
    }

    // Ignore PGRST116 error (no rows found - which is what we want)
    if (duplicateError && duplicateError.code !== 'PGRST116') {
      console.error('Duplicate check error:', duplicateError);
      return NextResponse.json(
        { success: false, error: 'Failed to check for duplicate registration' },
        { status: 500 }
      );
    }

    // ==================== VALIDATE FOREIGN KEY RELATIONSHIPS ====================
    
    // Get the UUIDs for school, course, and branch from the form data
    // These are already UUIDs from the frontend dropdown selections
    const school_id = formData.school; // This is the UUID
    const course_id = formData.course; // This is the UUID
    const branch_id = formData.branch; // This is the UUID
    
    // OPTIMIZATION: Parallelize school/course/branch validation for faster form submission
    const [
      { data: schoolData, error: schoolError },
      { data: courseData, error: courseError },
      { data: branchData, error: branchError }
    ] = await Promise.all([
      supabaseAdmin
        .from('config_schools')
        .select('id, name')
        .eq('id', school_id)
        .eq('is_active', true)
        .single(),
      supabaseAdmin
        .from('config_courses')
        .select('id, name, school_id')
        .eq('id', course_id)
        .eq('school_id', school_id)
        .eq('is_active', true)
        .single(),
      supabaseAdmin
        .from('config_branches')
        .select('id, name, course_id')
        .eq('id', branch_id)
        .eq('course_id', course_id)
        .eq('is_active', true)
        .single()
    ]);
    
    if (schoolError || !schoolData) {
      console.error('Invalid school ID:', school_id, schoolError);
      return NextResponse.json(
        { success: false, error: 'Invalid school selection. Please refresh and try again.' },
        { status: 400 }
      );
    }
    
    if (courseError || !courseData) {
      console.error('Invalid course ID or school mismatch:', course_id, courseError);
      return NextResponse.json(
        { success: false, error: 'Invalid course selection or course does not belong to selected school. Please refresh and try again.' },
        { status: 400 }
      );
    }
    
    if (branchError || !branchData) {
      console.error('Invalid branch ID or course mismatch:', branch_id, branchError);
      return NextResponse.json(
        { success: false, error: 'Invalid branch selection or branch does not belong to selected course. Please refresh and try again.' },
        { status: 400 }
      );
    }
    
    console.log('✅ Validated:', {
      school: schoolData.name,
      course: courseData.name,
      branch: branchData.name
    });
    
    // ==================== PREPARE SANITIZED DATA ====================
    // All data is already sanitized by Zod (trimmed, cased, validated)
    const sanitizedData = {
      registration_no: formData.registration_no,
      student_name: formData.student_name,
      admission_year: formData.admission_year,
      passing_year: formData.passing_year,
      parent_name: formData.parent_name,
      school_id: school_id,
      school: schoolData.name,
      course_id: course_id,
      course: courseData.name,
      branch_id: branch_id,
      branch: branchData.name,
      country_code: formData.country_code,
      contact_no: formData.contact_no,
      personal_email: formData.personal_email,
      college_email: formData.college_email,
      alumni_screenshot_url: formData.alumni_screenshot_url,
      status: 'pending',
      user_id: null
    };

    // ==================== INSERT FORM ====================
    
    const { data: form, error: insertError } = await supabaseAdmin
      .from('no_dues_forms')
      .insert([sanitizedData])
      .select()
      .single();

    if (insertError) {
      console.error('Form insertion error:', insertError);
      
      // Handle specific database errors
      if (insertError.code === '23505') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'A form with this registration number already exists',
            duplicate: true,
            registrationNo 
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to create form record' },
        { status: 500 }
      );
    }

    if (!form) {
      return NextResponse.json(
        { success: false, error: 'Form creation failed' },
        { status: 500 }
      );
    }

    console.log(`✅ Form created successfully - ID: ${form.id}, Reg: ${form.registration_no}`);

    // ==================== EMAIL NOTIFICATION SYSTEM ====================
    // Check admin setting to determine email mode (immediate vs daily digest)
    const sendImmediate = await shouldSendImmediateEmail();
    
    if (sendImmediate) {
      // IMMEDIATE MODE: Send real-time emails to all department staff
      console.log('📧 Immediate email mode - sending notifications now');
      
      try {
        // Get all department staff for email notification
        const { data: staffMembers, error: staffError } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, department_name, school_ids, course_ids, branch_ids')
          .eq('role', 'department')
          .not('email', 'is', null);

        if (!staffError && staffMembers && staffMembers.length > 0) {
          // Filter staff based on HOD scope
          const staffToNotify = staffMembers.filter(staff => {
            if (staff.department_name === 'school_hod') {
              if (staff.school_ids && !staff.school_ids.includes(form.school_id)) {
                return false;
              }
              if (staff.course_ids && staff.course_ids.length > 0 && !staff.course_ids.includes(form.course_id)) {
                return false;
              }
            }
            return true;
          });

          if (staffToNotify.length > 0) {
            const allStaffEmails = staffToNotify.map(s => s.email);
            
            await sendCombinedDepartmentNotification({
              allStaffEmails,
              studentData: {
                registration_no: form.registration_no,
                student_name: form.student_name,
                school: form.school,
                course: form.course,
                branch: form.branch,
                contact_no: form.contact_no,
                personal_email: form.personal_email
              },
              actionUrl: `${APP_URLS.PRODUCTION}/staff`
            });
            
            console.log(`✅ Immediate email sent to ${staffToNotify.length} staff members`);
          }
        }
      } catch (emailError) {
        console.error('Failed to send immediate notification:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      // DAILY DIGEST MODE: Email will be sent at 4 PM IST
      console.log('📊 Daily digest mode - application will be included in 4 PM reminder');
      console.log('   Staff will be notified at 4:00 PM IST with all pending applications');
    }

    // ==================== RETURN SUCCESS ====================
    
    return NextResponse.json({
      success: true,
      data: form,
      message: 'Application submitted successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Student API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/student?registration_no=XXX
 * Check if a form exists for a registration number
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

    const { data: form, error } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, created_at')
      .eq('registration_no', registrationNo.trim().toUpperCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { success: false, error: 'Database query failed' },
        { status: 500 }
      );
    }

    if (!form) {
      return NextResponse.json(
        { success: false, exists: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      exists: true,
      data: form
    });

  } catch (error) {
    console.error('Student GET API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}