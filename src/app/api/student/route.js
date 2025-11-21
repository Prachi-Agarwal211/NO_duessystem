import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAllDepartments } from '@/lib/emailService';

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
    const formData = await request.json();

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

    // Validate registration number format
    const regNoPattern = /^[A-Z0-9]{6,15}$/i;
    if (!regNoPattern.test(formData.registration_no.trim())) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid registration number format. Use alphanumeric characters (6-15 characters)' 
        },
        { status: 400 }
      );
    }

    // Validate contact number (10 digits)
    if (!/^\d{10}$/.test(formData.contact_no.trim())) {
      return NextResponse.json(
        { success: false, error: 'Contact number must be exactly 10 digits' },
        { status: 400 }
      );
    }

    // Validate name format (no numbers or special characters except spaces, dots, hyphens)
    const namePattern = /^[A-Za-z\s.\-']+$/;
    if (!namePattern.test(formData.student_name.trim())) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Student name should only contain letters, spaces, dots, and hyphens' 
        },
        { status: 400 }
      );
    }

    if (formData.parent_name && !namePattern.test(formData.parent_name.trim())) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parent name should only contain letters, spaces, dots, and hyphens' 
        },
        { status: 400 }
      );
    }

    // Validate session years if provided
    if (formData.session_from) {
      const yearPattern = /^\d{4}$/;
      if (!yearPattern.test(formData.session_from)) {
        return NextResponse.json(
          { success: false, error: 'Session from year must be in YYYY format' },
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

    if (formData.session_to) {
      const yearPattern = /^\d{4}$/;
      if (!yearPattern.test(formData.session_to)) {
        return NextResponse.json(
          { success: false, error: 'Session to year must be in YYYY format' },
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
    
    const sanitizedData = {
      registration_no: registrationNo,
      student_name: formData.student_name.trim(),
      session_from: formData.session_from?.trim() || null,
      session_to: formData.session_to?.trim() || null,
      parent_name: formData.parent_name?.trim() || null,
      school: formData.school,
      course: formData.course?.trim() || null,
      branch: formData.branch?.trim() || null,
      contact_no: formData.contact_no.trim(),
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
    
    // Fetch all department emails
    const { data: departments, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('name, email, display_name')
      .order('display_order');

    if (deptError) {
      console.error('Failed to fetch departments:', deptError);
      // Continue even if email fails - form is already created
    } else if (departments && departments.length > 0) {
      try {
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/staff/dashboard`;
        
        // Send notifications to all departments
        const emailResults = await notifyAllDepartments({
          departments: departments.map(d => ({ email: d.email, name: d.display_name })),
          studentName: form.student_name,
          registrationNo: form.registration_no,
          formId: form.id,
          dashboardUrl
        });

        console.log(`📧 Email notifications sent to ${departments.length} departments`);
      } catch (emailError) {
        console.error('Failed to send email notifications:', emailError);
        // Continue - form submission should not fail if emails fail
      }
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