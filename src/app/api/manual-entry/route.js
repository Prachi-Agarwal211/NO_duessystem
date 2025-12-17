import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/emailService';
import { manualEntrySchema, validateWithZod } from '@/lib/zodSchemas';

/**
 * POST /api/manual-entry
 * Register offline no-dues certificate
 * Creates entry directly in no_dues_forms table with is_manual_entry=true
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // ==================== ZOD VALIDATION ====================
    // Validates all required fields with proper types and formats
    const validation = validateWithZod(body, manualEntrySchema);

    if (!validation.success) {
      const errorFields = Object.keys(validation.errors);
      const firstError = validation.errors[errorFields[0]];

      return NextResponse.json(
        {
          error: firstError || 'Validation failed',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // All data is validated, sanitized, and transformed by Zod
    const {
      registration_no,
      student_name,
      admission_year,
      passing_year,
      personal_email,
      college_email,
      contact_no,
      school,
      course,
      branch,
      school_id,
      course_id,
      branch_id,
      certificate_url
    } = validation.data;

    // ===== VALIDATE AGAINST CONVOCATION DATABASE =====
    let convocationStudent = null;
    try {
      const { data: convocationData } = await supabaseAdmin
        .from('convocation_eligible_students')
        .select('student_name, admission_year, school')
        .eq('registration_no', registration_no.toUpperCase())
        .single();

      if (convocationData) {
        convocationStudent = convocationData;
        console.log('✅ Student found in convocation database:', {
          registration_no,
          name: convocationData.student_name
        });
      } else {
        console.log('ℹ️ Student not in convocation database - using provided data');
      }
    } catch (convocationError) {
      // Not in convocation list - continue with provided/placeholder data
      console.log('ℹ️ Student not eligible for convocation - proceeding with manual entry');
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

    // ===== INSERT INTO no_dues_forms with REAL data (NO PLACEHOLDERS) =====
    // Priority: 1) Convocation data, 2) User-provided data
    const finalStudentName = convocationStudent?.student_name || student_name;
    const finalAdmissionYear = convocationStudent?.admission_year || admission_year;

    // ✅ ALL CONTACT FIELDS ARE NOW MANDATORY - validated by Zod schema
    // No placeholders generated - if missing, Zod validation will reject
    const finalPersonalEmail = personal_email;
    const finalCollegeEmail = college_email;
    const finalContactNo = contact_no;
    const finalPassingYear = passing_year;

    // Additional validation check (belt and suspenders approach)
    if (!finalPersonalEmail || !finalCollegeEmail || !finalContactNo) {
      return NextResponse.json(
        { error: 'Contact information (personal email, college email, contact number) is mandatory for manual entry submission' },
        { status: 400 }
      );
    }

    console.log('📝 Creating manual entry with data:', {
      registration_no,
      student_name: finalStudentName,
      has_real_contact: true,
      source: convocationStudent ? 'convocation' : student_name ? 'user-provided' : 'minimal'
    });

    // Debug the insert data before sending
    const insertData = {
      // Registration number
      registration_no,

      // Use REAL data from convocation or user input, fallback to placeholders
      student_name: finalStudentName,
      personal_email: finalPersonalEmail,
      college_email: finalCollegeEmail,
      contact_no: finalContactNo,
      admission_year: finalAdmissionYear,
      passing_year: finalPassingYear,
      country_code: '+91',
      school: schoolData.name,

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
      manual_status: 'pending_review',  // ✅ CRITICAL: Use manual_status for manual entries
      status: 'pending',                 // Keep for compatibility
      user_id: null
    };

    console.log('🔍 DEBUG: Insert data being sent to database:', JSON.stringify(insertData, null, 2));

    const { data: newForm, error: insertError } = await supabaseAdmin
      .from('no_dues_forms')
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting manual entry:', insertError);
      return NextResponse.json(
        { error: 'Failed to register manual entry', details: insertError.message },
        { status: 500 }
      );
    }

    // ===== SEND CONFIRMATION EMAIL TO STUDENT =====
    // All emails are now real (no placeholders), so always send
    const emailToUse = newForm.personal_email;
    
    if (emailToUse) {
      try {
        await sendEmail({
          to: emailToUse,
          subject: `Manual Entry Submitted - ${registration_no}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
              <img src="https://jecrc.ac.in/wp-content/uploads/2023/06/logo-1.png" alt="JECRC" style="height: 60px; margin-bottom: 15px;"/>
              <h1 style="margin: 0; color: white; font-size: 24px;">JECRC University</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">No Dues Clearance System</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">📝 Manual Entry Submitted Successfully</h2>
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Dear Student,
              </p>
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Your offline no-dues certificate has been <strong>successfully submitted</strong> to the system and is now <strong>pending admin review</strong>.
              </p>
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0; color: #2563eb; font-size: 18px; font-weight: 600;">📋 Submission Details</p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>Registration No:</strong> <span style="font-family: monospace; background: white; padding: 2px 6px; border-radius: 4px;">${registration_no}</span></p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>School:</strong> ${school}</p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>Course:</strong> ${course}</p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>Branch:</strong> ${branch || 'N/A'}</p>
                <p style="margin: 0; color: #1f2937; font-size: 15px;"><strong>Status:</strong> <span style="color: #f59e0b; font-weight: 600;">PENDING ADMIN REVIEW</span></p>
              </div>
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⚠️ <strong>What's Next?</strong><br/>
                  The admin will review your submitted certificate and either approve or reject it. You will receive an email notification once the admin takes action.
                </p>
              </div>
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
                Thank you for using the JECRC UNIVERSITY NO DUES System!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">This is an automated email from JECRC UNIVERSITY NO DUES System.</p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px; text-align: center;">© ${new Date().getFullYear()} JECRC UNIVERSITY. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim()
        });
        console.log(`✅ Confirmation email sent to student: ${emailToUse}`);
      } catch (emailError) {
        console.error('Error sending student confirmation email:', emailError);
        // Don't fail the request if email fails - form is still created
      }
    }

    // ===== NO DEPARTMENT STATUS CREATION =====
    // Manual entries are ADMIN-ONLY for verification
    // Departments can VIEW the data but cannot approve/reject
    console.log('ℹ️ Manual entry created - Admin approval required (no department workflow)');

    // ===== NOTIFY ADMIN ABOUT NEW MANUAL ENTRY =====
    const { data: adminUsers } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (adminUsers && adminUsers.length > 0) {
      const adminEmailPromises = adminUsers.map(admin =>
        sendEmail({
          to: admin.email,
          subject: `📋 New Manual Entry Submitted - ${registration_no}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
              <img src="https://jecrc.ac.in/wp-content/uploads/2023/06/logo-1.png" alt="JECRC" style="height: 60px; margin-bottom: 15px;"/>
              <h1 style="margin: 0; color: white; font-size: 24px;">JECRC University</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">No Dues Clearance System</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">📋 New Manual Entry Submitted</h2>
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Hello <strong>${admin.full_name || 'Admin'}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                A student has submitted an offline no-dues certificate for review and approval.
              </p>
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0; color: #92400e; font-size: 13px; font-weight: 600; text-transform: uppercase;">Entry Details</p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>Registration No:</strong> <span style="font-family: monospace; background: white; padding: 2px 6px; border-radius: 4px;">${registration_no}</span></p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>School:</strong> ${school}</p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>Course:</strong> ${course}</p>
                <p style="margin: 0; color: #1f2937; font-size: 15px;"><strong>Branch:</strong> ${branch || 'N/A'}</p>
              </div>
              <p style="margin: 20px 0; color: #6b7280; font-size: 14px;">
                Please review and approve/reject this manual entry from your admin dashboard.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://nodues.jecrcuniversity.edu.in/admin" style="display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Review Manual Entry</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">This is an automated email from JECRC UNIVERSITY NO DUES System.</p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px; text-align: center;">© ${new Date().getFullYear()} JECRC UNIVERSITY. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `.trim()
        })
      );

      try {
        await Promise.all(adminEmailPromises);
        console.log(`✅ Notified ${adminUsers.length} admin(s) about manual entry`);
      } catch (emailError) {
        console.error('Error sending admin notifications:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Offline certificate registered successfully',
      data: {
        id: newForm.id,
        registration_no: newForm.registration_no,
        status: 'pending',
        note: 'Waiting for admin verification'
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
 * Get manual entries for viewing
 * - Admin: All manual entries
 * - Department Staff: View-only (filtered by scope) - NO ACTION ALLOWED
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
        rejection_reason,
        created_at,
        updated_at
      `)
      .eq('is_manual_entry', true)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Apply scope filtering based on role
    if (staffId) {
      const { data: staffProfile } = await supabaseAdmin
        .from('profiles')
        .select('role, department_name, school_id, school_ids, course_ids, branch_ids')
        .eq('id', staffId)
        .single();

      if (staffProfile) {
        // Department staff can VIEW manual entries within their scope (READ-ONLY)
        if (staffProfile.role === 'department' || staffProfile.role === 'staff') {
          // Apply scope filtering using UUID arrays
          if (staffProfile.school_ids && staffProfile.school_ids.length > 0) {
            query = query.in('school_id', staffProfile.school_ids);
          }
          if (staffProfile.course_ids && staffProfile.course_ids.length > 0) {
            query = query.in('course_id', staffProfile.course_ids);
          }
          if (staffProfile.branch_ids && staffProfile.branch_ids.length > 0) {
            query = query.in('branch_id', staffProfile.branch_ids);
          }
        }
        // Admin sees all manual entries (no filtering needed)
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