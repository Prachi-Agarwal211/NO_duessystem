import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAllDepartments } from '@/lib/emailService';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { validateRequest, VALIDATION_SCHEMAS } from '@/lib/validation';

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
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }

    const formData = await request.json();

    // Input validation using centralized validation library
    const validation = await validateRequest(request, VALIDATION_SCHEMAS.STUDENT_FORM);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validation.errors
        },
        { status: 400 }
      );
    }

    // ==================== FETCH VALIDATION RULES FROM DATABASE ====================
    const { data: validationRules, error: rulesError } = await supabaseAdmin
      .from('config_validation_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching validation rules:', rulesError);
    }

    // Create validation rules map with fallback to hardcoded patterns
    const rules = {};
    if (validationRules && validationRules.length > 0) {
      validationRules.forEach(rule => {
        try {
          rules[rule.rule_name] = {
            pattern: new RegExp(rule.rule_pattern, 'i'),
            error: rule.error_message
          };
        } catch (err) {
          console.error(`Invalid regex for ${rule.rule_name}:`, err);
        }
      });
    }

    // Fallback validation rules if database fetch fails
    if (Object.keys(rules).length === 0) {
      rules.registration_number = {
        pattern: /^[A-Z0-9]{6,15}$/i,
        error: 'Invalid registration number format. Use alphanumeric characters (6-15 characters)'
      };
      rules.student_name = {
        pattern: /^[A-Za-z\s.\-']+$/,
        error: 'Name should only contain letters, spaces, dots, hyphens, and apostrophes'
      };
      rules.phone_number = {
        pattern: /^[0-9]{6,15}$/,
        error: 'Phone number must be 6-15 digits'
      };
      rules.session_year = {
        pattern: /^\d{4}$/,
        error: 'Session year must be in YYYY format'
      };
    }

    // ==================== SERVER-SIDE VALIDATION ====================
    
    // Required fields validation
    if (!formData.registration_no?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Registration number is required' },
        { status: 400 }
      );
    }

    if (!formData.student_name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Student name is required' },
        { status: 400 }
      );
    }

    if (!formData.contact_no?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Contact number is required' },
        { status: 400 }
      );
    }

    if (!formData.school) {
      return NextResponse.json(
        { success: false, error: 'School selection is required' },
        { status: 400 }
      );
    }
    
    if (!formData.personal_email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Personal email is required' },
        { status: 400 }
      );
    }
    
    if (!formData.college_email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'College email is required' },
        { status: 400 }
      );
    }

    // ==================== CONFIGURABLE FORMAT VALIDATION ====================

    // Validate registration number using database rule
    if (rules.registration_number &&
        !rules.registration_number.pattern.test(formData.registration_no.trim())) {
      return NextResponse.json(
        { success: false, error: rules.registration_number.error },
        { status: 400 }
      );
    }

    // Validate contact number using database rule (without country code)
    if (rules.phone_number &&
        !rules.phone_number.pattern.test(formData.contact_no.trim())) {
      return NextResponse.json(
        { success: false, error: rules.phone_number.error },
        { status: 400 }
      );
    }

    // Validate student name using database rule
    if (rules.student_name &&
        !rules.student_name.pattern.test(formData.student_name.trim())) {
      return NextResponse.json(
        { success: false, error: rules.student_name.error },
        { status: 400 }
      );
    }

    // Validate parent name if provided
    if (formData.parent_name && rules.student_name &&
        !rules.student_name.pattern.test(formData.parent_name.trim())) {
      return NextResponse.json(
        { success: false, error: `Parent name - ${rules.student_name.error}` },
        { status: 400 }
      );
    }

    // Validate session years if provided using database rule
    if (formData.session_from && rules.session_year) {
      if (!rules.session_year.pattern.test(formData.session_from)) {
        return NextResponse.json(
          { success: false, error: `Session from - ${rules.session_year.error}` },
          { status: 400 }
        );
      }
      const fromYear = parseInt(formData.session_from);
      if (fromYear < 1900 || fromYear > new Date().getFullYear() + 10) {
        return NextResponse.json(
          { success: false, error: 'Session from year is invalid' },
          { status: 400 }
        );
      }
    }

    if (formData.session_to && rules.session_year) {
      if (!rules.session_year.pattern.test(formData.session_to)) {
        return NextResponse.json(
          { success: false, error: `Session to - ${rules.session_year.error}` },
          { status: 400 }
        );
      }
      const toYear = parseInt(formData.session_to);
      if (toYear < 1900 || toYear > new Date().getFullYear() + 10) {
        return NextResponse.json(
          { success: false, error: 'Session to year is invalid' },
          { status: 400 }
        );
      }
      
      // Validate session range
      if (formData.session_from && toYear < parseInt(formData.session_from)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Session to year must be greater than or equal to session from year'
          },
          { status: 400 }
        );
      }
    }
    
    // Validate email formats (basic pattern check)
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.personal_email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Invalid personal email format' },
        { status: 400 }
      );
    }
    
    if (!emailPattern.test(formData.college_email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Invalid college email format' },
        { status: 400 }
      );
    }

    // ==================== CHECK FOR DUPLICATES ====================
    
    const registrationNo = formData.registration_no.trim().toUpperCase();
    
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

    // ==================== SANITIZE AND PREPARE DATA ====================
    
    // Get the UUIDs for school, course, and branch from the form data
    // These are already UUIDs from the frontend dropdown selections
    const school_id = formData.school; // This is the UUID
    const course_id = formData.course; // This is the UUID
    const branch_id = formData.branch; // This is the UUID
    
    // Fetch the names for display purposes (keep text fields for backward compatibility)
    const { data: schoolData } = await supabaseAdmin
      .from('config_schools')
      .select('name')
      .eq('id', school_id)
      .single();
    
    const { data: courseData } = await supabaseAdmin
      .from('config_courses')
      .select('name')
      .eq('id', course_id)
      .single();
    
    const { data: branchData } = await supabaseAdmin
      .from('config_branches')
      .select('name')
      .eq('id', branch_id)
      .single();
    
    const sanitizedData = {
      registration_no: registrationNo,
      student_name: formData.student_name.trim(),
      session_from: formData.session_from?.trim() || null,
      session_to: formData.session_to?.trim() || null,
      parent_name: formData.parent_name?.trim() || null,
      school_id: school_id, // Store UUID for foreign key
      school: schoolData?.name || formData.school, // Store name for backward compatibility
      course_id: course_id, // Store UUID for foreign key
      course: courseData?.name || formData.course, // Store name for backward compatibility
      branch_id: branch_id, // Store UUID for foreign key
      branch: branchData?.name || formData.branch, // Store name for backward compatibility
      country_code: formData.country_code || '+91',
      contact_no: formData.contact_no.trim(),
      personal_email: formData.personal_email.trim().toLowerCase(),
      college_email: formData.college_email.trim().toLowerCase(),
      alumni_screenshot_url: formData.alumni_screenshot_url || null,
      status: 'pending',
      user_id: null // Phase 1: Students don't have authentication
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
    
    // IMPORTANT: Fetch staff based on department scope rules:
    // - 9 departments (Library, Hostel, Accounts, etc.): See ALL students
    // - 1 department (Department/HOD): Only see students from their school/course/branch
    
    const { data: allStaff, error: staffError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, department_name, school, course, branch')
      .eq('role', 'staff')
      .not('email', 'is', null);

    if (staffError) {
      console.error('Failed to fetch staff members:', staffError);
      // Continue even if email fails - form is already created
    } else if (allStaff && allStaff.length > 0) {
      try {
        // Filter staff based on scope:
        // - Department staff: Only those matching student's school/course/branch
        // - All other 9 departments: No filtering, all staff get notified
        const staffToNotify = allStaff.filter(staff => {
          // If Department staff (HOD/Dean), apply scope filtering
          if (staff.department_name === 'Department') {
            // Check school scope
            if (staff.school && staff.school !== sanitizedData.school) {
              return false; // Different school, don't notify
            }
            // Check course scope
            if (staff.course && staff.course !== sanitizedData.course) {
              return false; // Different course, don't notify
            }
            // Check branch scope
            if (staff.branch && staff.branch !== sanitizedData.branch) {
              return false; // Different branch, don't notify
            }
            return true; // Matches scope, notify this staff
          }
          
          // For all other 9 departments, notify everyone
          return true;
        });

        if (staffToNotify.length > 0) {
          const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/staff/dashboard`;
          
          const emailResults = await notifyAllDepartments({
            staffMembers: staffToNotify.map(staff => ({
              email: staff.email,
              name: staff.full_name,
              department: staff.department_name
            })),
            studentName: form.student_name,
            registrationNo: form.registration_no,
            formId: form.id,
            dashboardUrl
          });

          console.log(`📧 Notified ${staffToNotify.length} staff members (filtered from ${allStaff.length} total)`);
        } else {
          console.warn('⚠️ No staff members match the scope for this student');
        }
      } catch (emailError) {
        console.error('Failed to send email notifications:', emailError);
        // Continue - form submission should not fail if emails fail
      }
    } else {
      console.warn('⚠️ No staff members found to notify. Please add staff accounts in admin panel.');
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
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
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