import { supabaseAdmin } from './supabaseAdmin';

/**
 * Shared service for department action processing
 * Used by both /api/staff/action and /api/department-action routes
 */

/**
 * Update department status for a form
 * @param {Object} params - Action parameters
 * @param {string} params.formId - Form ID
 * @param {string} params.departmentName - Department name
 * @param {string} params.action - 'approve' or 'reject'
 * @param {string} params.userId - User ID performing action
 * @param {string} params.reason - Rejection reason (required if rejecting)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateDepartmentStatus({ formId, departmentName, action, userId, reason }) {
  try {
    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return { success: false, error: 'Invalid action. Must be "approve" or "reject"' };
    }

    // Validate rejection reason
    if (action === 'reject' && !reason) {
      return { success: false, error: 'Rejection reason is required when rejecting' };
    }

    // Check if the form exists
    const { data: form, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, status, student_name, registration_no')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return { success: false, error: 'Form not found' };
    }

    // Check if the status record exists for this department and form
    const { data: existingStatus, error: statusError } = await supabaseAdmin
      .from('no_dues_status')
      .select('id, status')
      .eq('form_id', formId)
      .eq('department_name', departmentName)
      .single();

    if (statusError || !existingStatus) {
      return { success: false, error: 'Department status not found for this form' };
    }

    // Check if status is already approved or rejected
    if (existingStatus.status === 'approved' || existingStatus.status === 'rejected') {
      return { success: false, error: `Status is already ${existingStatus.status}` };
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
    }

    const { data: updatedStatus, error: updateError } = await supabaseAdmin
      .from('no_dues_status')
      .update(updateData)
      .eq('id', existingStatus.id)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // NOTE: Database trigger "trigger_update_form_timestamp" handles updating
    // no_dues_forms.updated_at automatically when no_dues_status changes.

    // Check if all departments have approved
    const { data: allStatuses, error: allStatusError } = await supabaseAdmin
      .from('no_dues_status')
      .select('status')
      .eq('form_id', formId);

    if (allStatusError) {
      return { success: false, error: allStatusError.message };
    }

    // If all departments have approved, update the form status to completed
    const allApproved = allStatuses.every(status => status.status === 'approved');
    let formStatusUpdate = null;

    if (allApproved) {
      const { data: updatedForm, error: formUpdateError } = await supabaseAdmin
        .from('no_dues_forms')
        .update({ status: 'completed' })
        .eq('id', formId)
        .select()
        .single();

      if (formUpdateError) {
        return { success: false, error: formUpdateError.message };
      }

      formStatusUpdate = updatedForm;

      // Auto-generate certificate when all departments approve
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
          formStatusUpdate = {
            ...formStatusUpdate,
            certificate_url: certificateResult.certificateUrl
          };
        } else {
          console.error('❌ Certificate generation failed:', certificateResult.error);
        }
      } catch (certError) {
        console.error('❌ Certificate generation error:', certError);
      }
    }

    return {
      success: true,
      data: {
        status: updatedStatus,
        form: formStatusUpdate,
        message: `Successfully ${action}d the no dues request for ${form.student_name}`,
        allApproved
      }
    };
  } catch (error) {
    console.error('Department action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Verify user can perform action on department
 * @param {Object} profile - User profile
 * @param {string} departmentName - Department name
 * @returns {boolean} Whether user can act on department
 */
export function canActOnDepartment(profile, departmentName) {
  // Admin can act on any department
  if (profile.role === 'admin') {
    return true;
  }

  // Department staff can only act on their own department
  if (profile.role === 'department' && profile.department_name === departmentName) {
    return true;
  }

  return false;
}