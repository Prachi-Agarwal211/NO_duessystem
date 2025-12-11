import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAllDepartments } from '@/lib/emailService';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { validateForm, VALIDATION_SCHEMAS } from '@/lib/validation';

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
    // NOTE: We use validateForm instead of validateRequest because we already parsed the body
    const validation = validateForm(formData, VALIDATION_SCHEMAS.STUDENT_FORM);
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
        error: 'Year must be in YYYY format'
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

    // Validate parent name if provided (only if it has actual content)
    if (formData.parent_name && formData.parent_name.trim() && rules.student_name &&
        !rules.student_name.pattern.test(formData.parent_name.trim())) {
      return NextResponse.json(
        { success: false, error: `Parent name - ${rules.student_name.error}` },
        { status: 400 }
      );
    }

    // Validate years if provided using database rule
    // Only validate if field has actual content (not empty string or null)
    if (formData.admission_year && formData.admission_year.trim() && rules.session_year) {
      if (!rules.session_year.pattern.test(formData.admission_year)) {
        return NextResponse.json(
          { success: false, error: `Session from - ${rules.session_year.error}` },
          { status: 400 }
        );
      }
      const fromYear = parseInt(formData.admission_year);
      if (fromYear < 1900 || fromYear > new Date().getFullYear() + 10) {
        return NextResponse.json(
          { success: false, error: 'Session from year is invalid' },
          { status: 400 }
        );
      }
    }

    if (formData.passing_year && formData.passing_year.trim() && rules.session_year) {
      if (!rules.session_year.pattern.test(formData.passing_year)) {
        return NextResponse.json(
          { success: false, error: `Session to - ${rules.session_year.error}` },
          { status: 400 }
        );
      }
      const toYear = parseInt(formData.passing_year);
      if (toYear < 1900 || toYear > new Date().getFullYear() + 10) {
        return NextResponse.json(
          { success: false, error: 'Session to year is invalid' },
          { status: 400 }
        );
      }
      
      // Validate session range (only if both fields have values)
      if (formData.admission_year && formData.admission_year.trim() && toYear < parseInt(formData.admission_year)) {
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

    // ==================== VALIDATE FOREIGN KEY RELATIONSHIPS ====================
    
    // Get the UUIDs for school, course, and branch from the form data
    // These are already UUIDs from the frontend dropdown selections
    const school_id = formData.school; // This is the UUID
    const course_id = formData.course; // This is the UUID
    const branch_id = formData.branch; // This is the UUID
    
    // Validate school exists and is active
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('config_schools')
      .select('id, name')
      .eq('id', school_id)  // Fixed: Use ID not name
      .eq('is_active', true)
      .single();
    
    if (schoolError || !schoolData) {
      console.error('Invalid school ID:', school_id, schoolError);
      return NextResponse.json(
        { success: false, error: 'Invalid school selection. Please refresh and try again.' },
        { status: 400 }
      );
    }
    
    // Validate course exists, is active, and belongs to selected school
    const { data: courseData, error: courseError } = await supabaseAdmin
      .from('config_courses')
      .select('id, name, school_id')
      .eq('id', course_id)  // Fixed: Use ID not name
      .eq('school_id', school_id)
      .eq('is_active', true)
      .single();
    
    if (courseError || !courseData) {
      console.error('Invalid course ID or school mismatch:', course_id, courseError);
      return NextResponse.json(
        { success: false, error: 'Invalid course selection or course does not belong to selected school. Please refresh and try again.' },
        { status: 400 }
      );
    }
    
    // Validate branch exists, is active, and belongs to selected course
    const { data: branchData, error: branchError } = await supabaseAdmin
      .from('config_branches')
      .select('id, name, course_id')
      .eq('id', branch_id)  // Fixed: Use ID not name
      .eq('course_id', course_id)
      .eq('is_active', true)
      .single();
    
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
    const sanitizedData = {
      registration_no: registrationNo,
      student_name: formData.student_name.trim(),
      admission_year: formData.admission_year?.trim() ? formData.admission_year.trim() : null,
      passing_year: formData.passing_year?.trim() ? formData.passing_year.trim() : null,
      parent_name: formData.parent_name?.trim() ? formData.parent_name.trim() : null,
      school_id: school_id, // Store UUID for foreign key
      school: schoolData.name, // Store validated name
      course_id: course_id, // Store UUID for foreign key
      course: courseData.name, // Store validated name
      branch_id: branch_id, // Store UUID for foreign key
      branch: branchData.name, // Store validated name
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
    // - Non-HOD departments (Library, Hostel, Accounts, etc.): See ALL students
    // - HOD departments (school_hod): Only see students matching their school/course/branch arrays
    
    const { data: allStaff, error: staffError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, department_name, school_id, school_ids, course_ids, branch_ids')
      .eq('role', 'department')
      .not('email', 'is', null);

    if (staffError) {
      console.error('Failed to fetch staff members:', staffError);
      // Continue even if email fails - form is already created
    } else if (allStaff && allStaff.length > 0) {
      try {
        // Filter staff based on scope:
        // - school_hod staff: Only those matching student's school/course/branch (using UUID arrays)
        // - All other departments: No filtering, all staff get notified
        const staffToNotify = allStaff.filter(staff => {
          // If school_hod staff (HOD/Dean), apply scope filtering using UUID arrays
          if (staff.department_name === 'school_hod') {
            // Check school scope (using UUID arrays OR single school_id for backward compatibility)
            if (staff.school_ids && staff.school_ids.length > 0) {
              if (!staff.school_ids.includes(school_id)) {
                return false; // Student's school not in HOD's school array
              }
            } else if (staff.school_id && staff.school_id !== school_id) {
              return false; // Backward compatibility: single school_id doesn't match
            }
            
            // Check course scope (using UUID arrays)
            if (staff.course_ids && staff.course_ids.length > 0) {
              if (!staff.course_ids.includes(course_id)) {
                return false; // Student's course not in HOD's course array
              }
            }
            
            // Check branch scope (using UUID arrays)
            if (staff.branch_ids && staff.branch_ids.length > 0) {
              if (!staff.branch_ids.includes(branch_id)) {
                return false; // Student's branch not in HOD's branch array
              }
            }
            
            return true; // Matches scope, notify this HOD
          }
          
          // For all other 10 departments (non-HOD), notify everyone
          return true;
        });

        if (staffToNotify.length > 0) {
          const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://no-duessystem.vercel.app'}/staff/login`;
          
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