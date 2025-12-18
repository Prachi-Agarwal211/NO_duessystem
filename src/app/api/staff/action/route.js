import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendStatusUpdateNotification } from '@/lib/emailService';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { staffActionSchema, validateWithZod } from '@/lib/zodSchemas';
import { APP_URLS } from '@/lib/urlHelper';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PUT(request) {
  try {
    // Rate limiting: Prevent spam actions
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.ACTION);
    if (!rateLimitCheck.success) {
      return NextResponse.json(
        { error: rateLimitCheck.error || 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // ==================== SECURE AUTHENTICATION ====================
    // ✅ CRITICAL FIX: Get userId from auth token, NOT from request body
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const authUserId = user.id; // Auth user ID from Supabase Auth

    // ==================== ZOD VALIDATION ====================
    const body = await request.json();
    const validation = validateWithZod(body, staffActionSchema);
    
    if (!validation.success) {
      const errorFields = Object.keys(validation.errors);
      const firstError = validation.errors[errorFields[0]];
      
      return NextResponse.json(
        {
          success: false,
          error: firstError || 'Validation failed',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // All data is validated by Zod (action is enum-validated, reason required for reject)
    const { formId, departmentName, action, reason } = validation.data;

    // OPTIMIZATION: Parallelize all validation queries for faster response
    const [
      { data: profile, error: profileError },
      { data: department, error: deptLookupError },
      { data: form, error: formError },
      { data: existingStatus, error: statusError }
    ] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, role, assigned_department_ids, department_name, full_name')
        .eq('id', authUserId)
        .single(),
      supabaseAdmin
        .from('departments')
        .select('id, name, display_name')
        .eq('name', departmentName)
        .single(),
      supabaseAdmin
        .from('no_dues_forms')
        .select('id, status, student_name, registration_no')
        .eq('id', formId)
        .single(),
      supabaseAdmin
        .from('no_dues_status')
        .select('id, status, department_name')
        .eq('form_id', formId)
        .eq('department_name', departmentName)
        .maybeSingle()
    ]);

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: 'Profile not found'
      }, { status: 404 });
    }

    // ✅ CRITICAL FIX: Use profile.id (not auth user id) for tracking actions
    const userId = profile.id;

    // Verify user has department staff or admin role
    if (profile.role !== 'department' && profile.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Verify department exists
    if (deptLookupError || !department) {
      return NextResponse.json({
        success: false,
        error: 'Invalid department'
      }, { status: 400 });
    }

    // ✅ NEW UUID-BASED AUTHORIZATION CHECK
    // For department staff, verify they are assigned to this department via UUID
    if (profile.role === 'department') {
      const isAuthorized = profile.assigned_department_ids?.includes(department.id);
      
      if (!isAuthorized) {
        console.error('❌ Authorization failed:', {
          authUserId,
          profileId: userId,
          requestedDepartment: departmentName,
          requestedDepartmentId: department.id,
          assignedDepartmentIds: profile.assigned_department_ids
        });
        
        return NextResponse.json({
          success: false,
          error: `You are not authorized to manage ${department.display_name}`,
          details: {
            requestedDepartment: department.display_name,
            hint: 'Contact administrator to assign you to this department'
          }
        }, { status: 403 });
      }
      
      console.log('✅ Authorization passed:', {
        authUserId,
        profileId: userId,
        department: departmentName,
        departmentId: department.id
      });
    }

    if (formError || !form) {
      return NextResponse.json({
        success: false,
        error: 'Form not found'
      }, { status: 404 });
    }

    if (statusError) {
      console.error('❌ Status query error:', statusError);
      return NextResponse.json({
        success: false,
        error: 'Error querying department status',
        details: statusError.message
      }, { status: 500 });
    }

    if (!existingStatus) {
      // Get all statuses for this form to help diagnose the issue
      const { data: allStatuses } = await supabaseAdmin
        .from('no_dues_status')
        .select('department_name')
        .eq('form_id', formId);

      console.error('❌ Department status not found:', {
        formId,
        requestedDepartment: departmentName,
        availableStatuses: allStatuses?.map(s => s.department_name) || [],
        profileDepartment: profile.department_name
      });

      return NextResponse.json({
        success: false,
        error: 'Department status not found for this form',
        details: {
          formId,
          requestedDepartment: departmentName,
          availableDepartments: allStatuses?.map(s => s.department_name) || [],
          hint: 'The department name in the request may not match any status records for this form'
        }
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
        APP_URLS.certificateGenerateApi(),
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

    // ==================== SEND EMAIL NOTIFICATION TO STUDENT ====================
    // Get student email from the form (personal_email is primary, college_email as fallback)
    const { data: formWithEmail, error: emailFetchError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('personal_email, college_email, student_name, registration_no')
      .eq('id', formId)
      .single();

    if (formWithEmail && (formWithEmail.personal_email || formWithEmail.college_email)) {
      try {
        const { sendStatusUpdateToStudent } = await import('@/lib/emailService');
        const { EMAIL_URLS } = await import('@/lib/urlHelper');
        const studentEmail = formWithEmail.personal_email || formWithEmail.college_email;
        
        const emailResult = await sendStatusUpdateToStudent({
          studentEmail: studentEmail,
          studentName: formWithEmail.student_name,
          registrationNo: formWithEmail.registration_no,
          departmentName: departmentName,
          action: statusValue,
          rejectionReason: action === 'reject' ? reason : null,
          statusUrl: EMAIL_URLS.studentCheckStatus(formWithEmail.registration_no)
        });

        if (emailResult.success) {
          console.log(`✅ Status update email sent to student: ${studentEmail}`);
          
          // Log the email notification
          try {
            await supabaseAdmin.rpc('log_email_notification', {
              p_form_id: formId,
              p_recipient_email: studentEmail,
              p_notification_type: 'status_update',
              p_department_name: departmentName,
              p_status: 'sent'
            });
          } catch (logError) {
            console.error('Failed to log email notification:', logError);
          }
        } else {
          console.warn(`⚠️ Email ${emailResult.queued ? 'queued' : 'failed'} for student: ${studentEmail}`);
          
          // Log the failed/queued email
          try {
            await supabaseAdmin.rpc('log_email_notification', {
              p_form_id: formId,
              p_recipient_email: studentEmail,
              p_notification_type: 'status_update',
              p_department_name: departmentName,
              p_status: emailResult.queued ? 'queued' : 'failed',
              p_error_message: emailResult.error
            });
          } catch (logError) {
            console.error('Failed to log email notification:', logError);
          }
        }
      } catch (emailError) {
        console.error('❌ Failed to send email notification to student:', emailError);
        // Log the error
        try {
          await supabaseAdmin.rpc('log_email_notification', {
            p_form_id: formId,
            p_recipient_email: formWithEmail.personal_email || formWithEmail.college_email,
            p_notification_type: 'status_update',
            p_department_name: departmentName,
            p_status: 'failed',
            p_error_message: emailError.message
          });
        } catch (logError) {
          console.error('Failed to log email notification:', logError);
        }
        // Don't fail the request if email fails
      }
    } else {
      console.log('ℹ️ Student email not available - skipping email notification');
    }

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