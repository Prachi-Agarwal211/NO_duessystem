import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { sendStatusUpdateNotification } from '@/lib/emailService';

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

    // Get session and verify user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get user profile to check role and department
    const { data: profile, error: profileError } = await supabase
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
    const { data: form, error: formError } = await supabase
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
    const { data: existingStatus, error: statusError } = await supabase
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
      action_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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

    const { data: updatedStatus, error: updateError } = await supabase
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
    const { data: allStatuses, error: allStatusError } = await supabase
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
      const { data: updatedForm, error: formUpdateError } = await supabase
        .from('no_dues_forms')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
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
    } else {
      // Update form status to in_progress if it was pending
      if (form.status === 'pending') {
        const { data: updatedForm, error: formUpdateError } = await supabase
          .from('no_dues_forms')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString()
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
      }
    }

    // Send email notification to student (via contact number or profile email)
    const { data: studentProfile, error: studentError } = await supabase
      .from('no_dues_forms')
      .select('profiles!no_dues_forms_user_id_fkey(email)')
      .eq('id', formId)
      .single();

    if (!studentError && studentProfile?.profiles?.email) {
      try {
        await sendStatusUpdateNotification({
          email: studentProfile.profiles.email,
          studentName: form.student_name,
          action: statusValue
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

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