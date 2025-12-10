import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendStatusUpdateNotification } from '@/lib/emailService';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { validateRequest, VALIDATION_SCHEMAS } from '@/lib/validation';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PUT(request) {
  try {
    // Rate limiting: Prevent spam actions
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.ACTION);
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }

    const body = await request.json();

    // Input validation using centralized validation library
    const validation = await validateRequest(request, VALIDATION_SCHEMAS.STAFF_ACTION);
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

    // Verify user has department staff or admin role
    if (profile.role !== 'department' && profile.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // For department staff members, verify they can only act on their department
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

    // ==================== IMPORTANT ====================
    // Form status update is handled by database trigger: trigger_update_form_status
    // The trigger automatically sets form status to 'completed' when all departments approve
    // We don't need to manually check or update it here - this prevents race conditions
    // ===================================================

    // Get the updated form status (may have been changed by trigger)
    const { data: currentForm, error: formFetchError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, status, student_name, registration_no')
      .eq('id', formId)
      .single();

    if (formFetchError) {
      console.error('Error fetching form after status update:', formFetchError);
    }

    // ==================== ASYNC CERTIFICATE GENERATION ====================
    // If form is now completed (trigger updated it), generate certificate in background
    // Don't await - let it happen asynchronously to not block the response
    if (currentForm?.status === 'completed') {
      console.log(`🎓 Form completed - triggering background certificate generation for ${formId}`);
      
      // Fire and forget - certificate generation happens in background
      // Use proper error handling with catch to prevent unhandled promise rejections
      fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/certificate/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formId })
        }
      )
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then(result => {
          if (result.success) {
            console.log(`✅ Certificate generated: ${result.certificateUrl}`);
          } else {
            console.error('❌ Certificate generation failed:', result.error);
          }
        })
        .catch(error => {
          // Log but don't throw - this is fire-and-forget
          console.error('❌ Certificate generation error:', error.message || error);
        });
    }

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
        form: currentForm || form,
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