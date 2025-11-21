import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendStatusUpdateNotification } from '@/lib/emailService';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PUT(request) {
  try {
    const body = await request.json();
    const { formId, departmentName, action, reason, userId } = body;

    // Validate required fields
    if (!formId || !departmentName || !action || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: formId, departmentName, action, userId'
      }, { status: 400 });
    }

    // Validate action value
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      }, { status: 400 });
    }

    // Get user profile to check role and department using admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, department_name, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: 'Profile not found'
      }, { status: 404 });
    }

    // Verify user has department or admin role (Phase 1: only 2 roles)
    if (profile.role !== 'department' && profile.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // For department staff, verify they can only act on their department
    if (profile.role === 'department' && profile.department_name !== departmentName) {
      return NextResponse.json({
        success: false,
        error: 'You can only take actions for your own department'
      }, { status: 403 });
    }

    // Check if the form exists
    const { data: form, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, status, student_name, registration_no')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return NextResponse.json({
        success: false,
        error: 'Form not found'
      }, { status: 404 });
    }

    // Check if the status record exists for this department and form
    const { data: existingStatus, error: statusError } = await supabaseAdmin
      .from('no_dues_status')
      .select('id, status')
      .eq('form_id', formId)
      .eq('department_name', departmentName)
      .single();

    if (statusError || !existingStatus) {
      return NextResponse.json({
        success: false,
        error: 'Department status not found for this form'
      }, { status: 404 });
    }

    // Check if status is already approved or rejected
    if (existingStatus.status === 'approved' || existingStatus.status === 'rejected') {
      return NextResponse.json({
        success: false,
        error: `Status is already ${existingStatus.status}`
      }, { status: 400 });
    }

    // Update the status
    const statusValue = action === 'approve' ? 'approved' : 'rejected';
    const updateData = {
      status: statusValue,
      action_by_user_id: userId,
      action_at: new Date().toISOString()
    };

    // Add rejection reason if rejecting
    if (action === 'reject' && reason) {
      updateData.rejection_reason = reason;
    } else if (action === 'reject' && !reason) {
      return NextResponse.json({
        success: false,
        error: 'Rejection reason is required when rejecting'
      }, { status: 400 });
    }

    const { data: updatedStatus, error: updateError } = await supabaseAdmin
      .from('no_dues_status')
      .update(updateData)
      .eq('id', existingStatus.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: updateError.message
      }, { status: 500 });
    }

    // Check if all departments have approved
    const { data: allStatuses, error: allStatusError } = await supabaseAdmin
      .from('no_dues_status')
      .select('status')
      .eq('form_id', formId);

    if (allStatusError) {
      return NextResponse.json({
        success: false,
        error: allStatusError.message
      }, { status: 500 });
    }

    // If all departments have approved, update the form status to completed
    const allApproved = allStatuses.every(status => status.status === 'approved');
    let formStatusUpdate = null;

    if (allApproved) {
      const { data: updatedForm, error: formUpdateError } = await supabaseAdmin
        .from('no_dues_forms')
        .update({
          status: 'completed'
        })
        .eq('id', formId)
        .select()
        .single();

      if (formUpdateError) {
        return NextResponse.json({
          success: false,
          error: formUpdateError.message
        }, { status: 500 });
      }

      formStatusUpdate = updatedForm;

      // ==================== AUTO-GENERATE CERTIFICATE ====================
      // When all departments approve, automatically generate the certificate
      try {
        console.log(`🎓 All departments approved - generating certificate for form ${formId}`);

        const certificateResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/certificate/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formId })
          }
        );

        const certificateResult = await certificateResponse.json();

        if (certificateResult.success) {
          console.log(`✅ Certificate generated successfully: ${certificateResult.certificateUrl}`);

          // Update form status update to include certificate info
          formStatusUpdate = {
            ...formStatusUpdate,
            certificate_url: certificateResult.certificateUrl
          };
        } else {
          console.error('❌ Certificate generation failed:', certificateResult.error);
          // Don't fail the approval if certificate generation fails
          // The certificate can be generated manually later
        }
      } catch (certError) {
        console.error('❌ Certificate generation error:', certError);
        // Don't fail the approval if certificate generation fails
      }
    }
    // Note: Form status remains 'pending' until all departments approve
    // No need to update to intermediate status - this keeps it simple

    // Send email notification to student
    // Phase 1: Students have no authentication/profiles, so we can't send email notifications
    // In future phases, add email field to no_dues_forms table or create student profiles

    // Note: Email notification currently disabled for Phase 1
    // To enable: Add student_email field to no_dues_forms table
    // Then uncomment and update the code below:

    /*
    if (form.student_email) {
      try {
        const { sendStatusUpdateToStudent } = await import('@/lib/emailService');
        await sendStatusUpdateToStudent({
          studentEmail: form.student_email,
          studentName: form.student_name,
          registrationNo: form.registration_no,
          departmentName: departmentName,
          action: statusValue,
          rejectionReason: action === 'reject' ? reason : null,
          statusUrl: `${process.env.NEXT_PUBLIC_APP_URL}/student/check-status?reg=${form.registration_no}`
        });
        console.log(`📧 Status update email sent to student: ${form.student_email}`);
      } catch (emailError) {
        console.error('Failed to send email notification to student:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.log('ℹ️ Student email not available - skipping email notification');
    }
    */

    console.log('ℹ️ Phase 1: Student email notifications disabled (no student_email field)');

    return NextResponse.json({
      success: true,
      data: {
        status: updatedStatus,
        form: formStatusUpdate,
        message: `Successfully ${action}d the no dues request for ${form.student_name}`
      }
    });
  } catch (error) {
    console.error('Staff Action API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}