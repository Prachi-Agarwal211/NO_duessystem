import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCombinedDepartmentNotification } from '@/lib/emailService';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { studentFormSchema, validateWithZod } from '@/lib/zodSchemas';
import { APP_URLS } from '@/lib/urlHelper';
import { ApiResponse } from '@/lib/apiResponse';
import { SmsService } from '@/lib/smsService';

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

    // ==================== VALIDATE / RESOLVE CONFIG IDS ====================
    // These might be UUIDs (from dropdown) or Names (if manually entered/imported)
    let school_id = formData.school;
    let course_id = formData.course;
    let branch_id = formData.branch;
    let school_name = '';
    let course_name = '';
    let branch_name = '';

    const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // 1. Resolve School
    if (isUuid(school_id)) {
      const { data: s } = await supabaseAdmin.from('config_schools').select('name').eq('id', school_id).single();
      if (s) school_name = s.name;
      else return NextResponse.json({ success: false, error: 'Invalid school ID' }, { status: 400 });
    } else {
      school_name = school_id;
      const { data: s } = await supabaseAdmin.from('config_schools').select('id').eq('name', school_name).single();
      if (s) school_id = s.id;
      else {
        const { data: newS, error } = await supabaseAdmin.from('config_schools').insert({ name: school_name }).select('id').single();
        if (error) throw error;
        school_id = newS.id;
      }
    }

    // 2. Resolve Course
    if (isUuid(course_id)) {
      const { data: c } = await supabaseAdmin.from('config_courses').select('name').eq('id', course_id).single();
      if (c) course_name = c.name;
      else return NextResponse.json({ success: false, error: 'Invalid course ID' }, { status: 400 });
    } else {
      course_name = course_id;
      const { data: c } = await supabaseAdmin.from('config_courses').select('id').eq('school_id', school_id).eq('name', course_name).single();
      if (c) course_id = c.id;
      else {
        const { data: newC, error } = await supabaseAdmin.from('config_courses').insert({ school_id, name: course_name }).select('id').single();
        if (error) throw error;
        course_id = newC.id;
      }
    }

    // 3. Resolve Branch
    if (isUuid(branch_id)) {
      const { data: b } = await supabaseAdmin.from('config_branches').select('name').eq('id', branch_id).single();
      if (b) branch_name = b.name;
      else return NextResponse.json({ success: false, error: 'Invalid branch ID' }, { status: 400 });
    } else {
      branch_name = branch_id;
      const { data: b } = await supabaseAdmin.from('config_branches').select('id').eq('course_id', course_id).eq('name', branch_name).single();
      if (b) branch_id = b.id;
      else {
        const { data: newB, error } = await supabaseAdmin.from('config_branches').insert({ course_id, name: branch_name }).select('id').single();
        if (error) throw error;
        branch_id = newB.id;
      }
    }

    console.log('✅ Config Resolved:', { school_name, course_name, branch_name });

    // ==================== PREPARE SANITIZED DATA ====================
    // All data is already sanitized by Zod (trimmed, cased, validated)
    const sanitizedData = {
      registration_no: formData.registration_no,
      student_name: formData.student_name,
      admission_year: formData.admission_year,
      passing_year: formData.passing_year,
      parent_name: formData.parent_name,
      school_id: school_id,
      school: school_name,
      course_id: course_id,
      course: course_name,
      branch_id: branch_id,
      branch: branch_name,
      country_code: formData.country_code,
      contact_no: formData.contact_no,
      personal_email: formData.personal_email,
      college_email: formData.college_email,
      alumni_profile_link: formData.alumni_profile_link,
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

    // ==================== SEND EMAIL NOTIFICATIONS ====================
    // 🔕 DISABLED: Moved to Daily Email Digest at 3:00 PM
    /*
    try {
      // ... existing notification logic ...
    } catch (emailError) {
      console.error('❌ Email notification failed (non-fatal):', emailError);
    }
    */

    // ==================== SEND CONFIRMATION SMS ====================
    if (form.contact_no) {
      // Fire and forget SMS
      SmsService.sendSMS(
        form.contact_no,
        SmsService.TEMPLATES.SUBMISSION_CONFIRMED(form.student_name, form.registration_no)
      ).catch(err => console.error('SMS Failed:', err));
    }

    console.log(`✅ Form submitted - Digest notification will be sent at 3:00 PM`);

    // ==================== RETURN SUCCESS ====================

    return ApiResponse.success(form, 'Application submitted successfully', 201);

  } catch (error) {
    console.error('Student API Error:', error);
    return ApiResponse.error('Internal server error', 500, error.message);
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