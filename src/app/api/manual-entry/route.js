import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/emailService';

/**
 * POST /api/manual-entry
 * Register offline no-dues certificate
 * Creates entry directly in no_dues_forms table with is_manual_entry=true
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    const {
      registration_no,
      school,
      course,
      branch,
      school_id,
      course_id,
      branch_id,
      certificate_url
    } = body;

    // Validate required fields
    if (!registration_no || !school_id || !course_id || !certificate_url) {
      return NextResponse.json(
        { error: 'Missing required fields: registration_no, school_id, course_id, and certificate are required' },
        { status: 400 }
      );
    }

    // ===== CRITICAL: Check if student already exists in system =====
    const { data: existingForm } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, status, is_manual_entry')
      .eq('registration_no', registration_no)
      .single();

    if (existingForm) {
      const entryType = existingForm.is_manual_entry ? 'manual' : 'online';
      return NextResponse.json(
        {
          error: 'Registration number already exists',
          details: `A ${entryType} form with registration number ${registration_no} already exists with status: ${existingForm.status}`
        },
        { status: 409 }
      );
    }

    // ===== VALIDATE FOREIGN KEY RELATIONSHIPS (same as /api/student) =====
    
    // Validate school exists and is active
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('config_schools')
      .select('id, name')
      .eq('id', school_id)
      .eq('is_active', true)
      .single();
    
    if (schoolError || !schoolData) {
      console.error('Invalid school ID:', school_id, schoolError);
      return NextResponse.json(
        { error: 'Invalid school selection. Please refresh and try again.' },
        { status: 400 }
      );
    }
    
    // Validate course exists, is active, and belongs to selected school
    const { data: courseData, error: courseError } = await supabaseAdmin
      .from('config_courses')
      .select('id, name, school_id')
      .eq('id', course_id)
      .eq('school_id', school_id)
      .eq('is_active', true)
      .single();
    
    if (courseError || !courseData) {
      console.error('Invalid course ID or school mismatch:', course_id, courseError);
      return NextResponse.json(
        { error: 'Invalid course selection or course does not belong to selected school. Please refresh and try again.' },
        { status: 400 }
      );
    }
    
    // Validate branch (if provided) - branch is optional for some courses
    let branchData = null;
    if (branch_id) {
      const { data: branchResult, error: branchError } = await supabaseAdmin
        .from('config_branches')
        .select('id, name, course_id')
        .eq('id', branch_id)
        .eq('course_id', course_id)
        .eq('is_active', true)
        .single();
      
      if (branchError || !branchResult) {
        console.error('Invalid branch ID or course mismatch:', branch_id, branchError);
        return NextResponse.json(
          { error: 'Invalid branch selection or branch does not belong to selected course. Please refresh and try again.' },
          { status: 400 }
        );
      }
      branchData = branchResult;
    }
    
    console.log('✅ Validated:', {
      school: schoolData.name,
      course: courseData.name,
      branch: branchData ? branchData.name : 'N/A'
    });

    // ===== INSERT INTO no_dues_forms with MINIMAL data for manual entry =====
    const { data: newForm, error: insertError } = await supabaseAdmin
      .from('no_dues_forms')
      .insert([{
        // ONLY registration number (what user provides)
        registration_no,
        
        // Database required fields - use minimal placeholders
        student_name: 'Manual Entry',
        personal_email: `${registration_no.toLowerCase()}@manual.temp`,
        college_email: `${registration_no.toLowerCase()}@manual.jecrc.temp`,
        contact_no: '0000000000',
        country_code: '+91',
        school: schoolData.name,  // Required field - use text name
        
        // Optional UUID foreign keys for filtering
        school_id: school_id || null,
        course_id: course_id || null,
        branch_id: branch_id || null,
        
        // Optional text fields
        course: courseData ? courseData.name : null,
        branch: branchData ? branchData.name : null,
        
        // Manual entry specific fields
        is_manual_entry: true,
        manual_certificate_url: certificate_url,
        status: 'pending',
        user_id: null
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting manual entry:', insertError);
      return NextResponse.json(
        { error: 'Failed to register manual entry', details: insertError.message },
        { status: 500 }
      );
    }

    // ===== CREATE DEPARTMENT STATUS - ONLY FOR "Department" =====
    // Manual entries only need Department approval (not all 11 departments)
    const { error: statusError } = await supabaseAdmin
      .from('no_dues_status')
      .insert([{
        form_id: newForm.id,
        department_name: 'Department',
        status: 'pending',
        comment: 'Manual entry - requires certificate verification'
      }]);

    if (statusError) {
      console.error('Error creating department status:', statusError);
      // Continue even if status creation fails
    }

    // ===== NOTIFY ONLY MATCHING DEPARTMENT STAFF =====
    const { data: departmentStaff, error: staffError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name, school_id, school_ids, course_ids, branch_ids')
      .eq('role', 'department')  // FIXED: Changed from 'staff' to 'department'
      .eq('department_name', 'Department');
    
    // Filter staff by scoping on the application side since we're using UUID arrays
    const matchingStaff = departmentStaff?.filter(staff => {
      // If staff has no scope, they see all students
      const hasNoScope = !staff.school_ids && !staff.course_ids && !staff.branch_ids;
      if (hasNoScope) return true;
      
      // Check if school matches
      const schoolMatches = !staff.school_ids || staff.school_ids.includes(school_id);
      // Check if course matches
      const courseMatches = !staff.course_ids || staff.course_ids.includes(course_id);
      // Check if branch matches
      const branchMatches = !staff.branch_ids || !branch_id || staff.branch_ids.includes(branch_id);
      
      return schoolMatches && courseMatches && branchMatches;
    }) || [];

    if (staffError) {
      console.error('Error fetching department staff:', staffError);
    }

    // Send email ONLY to matching department staff
    if (matchingStaff && matchingStaff.length > 0) {
      const emailPromises = matchingStaff.map(staff =>
        sendEmail({
          to: staff.email,
          subject: `New Offline Certificate Registration - ${registration_no}`,
          text: `
Hello ${staff.full_name || 'Department Staff'},

A student has registered their offline no-dues certificate for verification.

Registration Details:
- Registration Number: ${registration_no}
- School: ${school}
- Course: ${course}
- Branch: ${branch || 'N/A'}

Action Required:
Please log in to your dashboard to review and verify the certificate.

Certificate URL: ${certificate_url}

This is an automated notification from JECRC No Dues System.
          `.trim(),
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #C41E3A 0%, #8B0000 100%); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔔 New Offline Certificate</h1>
  </div>
  
  <div style="padding: 30px; background: #f9f9f9;">
    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
      Hello <strong>${staff.full_name || 'Department Staff'}</strong>,
    </p>
    
    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
      A student has registered their offline no-dues certificate and needs your verification.
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C41E3A;">
      <h3 style="color: #C41E3A; margin-top: 0;">Registration Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; font-weight: bold;">Registration Number:</td>
          <td style="padding: 8px 0; color: #333;">${registration_no}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-weight: bold;">School:</td>
          <td style="padding: 8px 0; color: #333;">${school}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-weight: bold;">Course:</td>
          <td style="padding: 8px 0; color: #333;">${course}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-weight: bold;">Branch:</td>
          <td style="padding: 8px 0; color: #333;">${branch || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ Action Required</p>
      <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
        Please log in to your dashboard to review and verify the uploaded certificate.
      </p>
    </div>
    
    <div style="margin: 20px 0; text-align: center;">
      <a href="${certificate_url}" 
         style="display: inline-block; background: #C41E3A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        View Certificate
      </a>
    </div>
  </div>
  
  <div style="background: #333; padding: 20px; text-align: center;">
    <p style="color: #999; font-size: 12px; margin: 0;">
      This is an automated notification from JECRC No Dues Clearance System
    </p>
  </div>
</div>
          `.trim()
        })
      );

      try {
        await Promise.all(emailPromises);
        console.log(`✅ Notified ${matchingStaff.length} department staff members for ${school} - ${course}`);
      } catch (emailError) {
        console.error('Error sending notification emails:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.warn(`⚠️ No department staff found for school: ${school}, course: ${course}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Offline certificate registered successfully',
      data: {
        id: newForm.id,
        registration_no: newForm.registration_no,
        status: 'pending',
        note: 'Waiting for department verification'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in manual entry registration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/manual-entry
 * Get manual entries (for department staff dashboard)
 * Filtered by staff scope
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const staffId = searchParams.get('staff_id');

    // Query only manual entries from no_dues_forms with all needed fields
    let query = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        personal_email,
        college_email,
        contact_no,
        country_code,
        parent_name,
        school,
        course,
        branch,
        admission_year,
        passing_year,
        manual_certificate_url,
        status,
        created_at,
        updated_at
      `)
      .eq('is_manual_entry', true)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Apply staff scope filtering
    if (staffId) {
      const { data: staffProfile } = await supabaseAdmin
        .from('profiles')
        .select('department_name, school_id, school_ids, course_ids, branch_ids')
        .eq('id', staffId)
        .single();

      if (staffProfile && staffProfile.department_name === 'Department') {
        // Apply scope filtering using UUID arrays
        if (staffProfile.school_ids && staffProfile.school_ids.length > 0) {
          query = query.in('school', staffProfile.school_ids);
        }
        if (staffProfile.course_ids && staffProfile.course_ids.length > 0) {
          query = query.in('course', staffProfile.course_ids);
        }
        if (staffProfile.branch_ids && staffProfile.branch_ids.length > 0) {
          query = query.in('branch', staffProfile.branch_ids);
        }
      } else {
        // Non-department staff see no manual entries
        return NextResponse.json({
          success: true,
          data: []
        });
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching manual entries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch manual entries', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error in manual entry fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}