/**
 * Unified Application Service (Supabase Edition)
 * * Consolidates all application-related functionality using Supabase:
 * - Form submission and validation
 * - Status tracking and updates
 * - Reapplication workflow
 * - Certificate generation triggers
 * - Real-time notifications
 */

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import realtimeService from '@/lib/realtimeService';

class ApplicationService {

  /**
   * Submit a new no-dues application
   */
  async submitApplication(formData) {
    try {
      console.log('📝 Submitting application via Supabase Service...');

      // 1. Check for duplicates
      await this.checkForDuplicates(formData.registration_no);

      // 2. Create the form and related data
      const { data: form, error: formError } = await supabase
        .from('no_dues_forms')
        .insert({
          registration_no: formData.registration_no.toUpperCase(),
          student_name: formData.student_name,
          parent_name: formData.parent_name,
          admission_year: formData.admission_year,
          passing_year: formData.passing_year,
          school_id: formData.school,
          school: formData.school_name || '',
          course_id: formData.course,
          course: formData.course_name || '',
          branch_id: formData.branch,
          branch: formData.branch_name || '',
          country_code: formData.country_code,
          contact_no: formData.contact_no,
          personal_email: formData.personal_email,
          college_email: formData.college_email,
          alumni_profile_link: formData.alumni_profile_link,
          status: 'pending',
          is_reapplication: false,
          reapplication_count: 0
        })
        .select()
        .single();

      if (formError) {
        if (formError.code === '23505') { // Unique violation
          throw new Error('A form with this registration number already exists');
        }
        throw new Error(formError.message || 'Failed to create form');
      }

      // 3. Create initial department statuses
      await this.createDepartmentStatuses(form.id);

      // 4. Sync student data to master table
      await this.syncStudentData(form.id, formData);

      // 5. Trigger Real-time Notification (Non-blocking)
      this.triggerRealtimeUpdate('form_submission', form).catch(err =>
        console.error('Realtime trigger error:', err)
      );

      // 6. Send Email Notifications (Non-blocking)
      this.sendInitialNotifications(form).catch(err =>
        console.error('Email notification error:', err)
      );

      console.log('✅ Application submitted successfully via Supabase');
      return { success: true, data: form };

    } catch (error) {
      console.error('❌ Application submission failed:', error);
      throw error;
    }
  }

  /**
   * Handle Department Approval
   */
  async handleDepartmentApproval(formId, departmentName, remarks, actionBy) {
    try {
      console.log(`✅ Handling approval for ${formId} by ${departmentName}`);

      // 1. Update status to Approved
      const { data: updatedStatus, error: statusError } = await supabase
        .from('no_dues_status')
        .update({
          status: 'approved',
          action_by: actionBy || departmentName,
          action_at: new Date().toISOString(),
          remarks: remarks || null,
          rejection_reason: null
        })
        .eq('form_id', formId)
        .eq('department_name', departmentName)
        .select()
        .single();

      if (statusError) throw new Error(statusError.message);

      // 2. Check overall status of the form
      const { data: allStatuses, error: statusesError } = await supabase
        .from('no_dues_status')
        .select('*')
        .eq('form_id', formId);

      if (statusesError) throw new Error(statusesError.message);

      const allApproved = allStatuses.every(s => s.status === 'approved');
      const hasRejection = allStatuses.some(s => s.status === 'rejected');

      let newFormStatus = 'in_progress';
      if (hasRejection) newFormStatus = 'rejected';
      else if (allApproved) newFormStatus = 'completed';

      // 3. Update Form Status
      const { data: updatedForm, error: formError } = await supabase
        .from('no_dues_forms')
        .update({
          status: newFormStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)
        .select()
        .single();

      if (formError) throw new Error(formError.message);

      const result = { updatedForm, updatedStatus, allApproved, newFormStatus };

      // Post-transaction actions
      if (result.allApproved) {
        this.sendCertificateReadyNotification(result.updatedForm);
      }

      await this.triggerRealtimeUpdate('department_approval', result);

      return { success: true, data: result };

    } catch (error) {
      console.error('❌ Department approval failed:', error);
      throw error;
    }
  }

  /**
   * Handle Department Rejection
   */
  async handleDepartmentRejection(formId, departmentName, reason, remarks, actionBy) {
    try {
      console.log(`🚫 Handling rejection for ${formId} by ${departmentName}`);

      // 1. Update Department Status
      const { data: updatedStatus, error: statusError } = await supabase
        .from('no_dues_status')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          remarks: remarks || null,
          action_by: actionBy || departmentName,
          action_at: new Date().toISOString()
        })
        .eq('form_id', formId)
        .eq('department_name', departmentName)
        .select()
        .single();

      if (statusError) throw new Error(statusError.message);

      // 2. Update Form Status
      const { data: updatedForm, error: formError } = await supabase
        .from('no_dues_forms')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)
        .select()
        .single();

      if (formError) throw new Error(formError.message);

      const result = { updatedForm, updatedStatus };

      // Notifications
      this.sendRejectionNotifications(result.updatedForm, departmentName, reason);
      await this.triggerRealtimeUpdate('department_rejection', result);

      return { success: true, data: result };

    } catch (error) {
      console.error('❌ Department rejection failed:', error);
      throw error;
    }
  }

  /**
   * Get Student Status
   */
  async getStudentStatus(registrationNo) {
    try {
      // Get the form
      const { data: form, error: formError } = await supabase
        .from('no_dues_forms')
        .select('*')
        .eq('registration_no', registrationNo.toUpperCase())
        .single();

      if (formError || !form) {
        throw new Error('No form found with this registration number');
      }

      // Get department statuses
      const { data: departmentStatuses, error: statusError } = await supabase
        .from('no_dues_status')
        .select('*')
        .eq('form_id', form.id);

      if (statusError) {
        console.error('Error fetching department statuses:', statusError);
        // Continue with empty array if there's an error
      }

      return {
        success: true,
        data: {
          form,
          departmentStatuses: departmentStatuses || [],
          overallStatus: form.status,
          isCompleted: form.status === 'completed',
          isRejected: form.status === 'rejected',
          certificateGenerated: form.final_certificate_generated,
          certificateUrl: form.certificate_url
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ================= PRIVATE HELPERS =================

  async checkForDuplicates(registrationNo) {
    const { data, error } = await supabase
      .from('no_dues_forms')
      .select('id, status')
      .eq('registration_no', registrationNo.toUpperCase())
      .maybeSingle();

    if (data) {
      if (data.status === 'rejected') {
        // Allow re-submission by marking the old form as archived or deleting if needed
        // For now, we just let the unique constraint handle it unless we decide to purge
        // A better way is to allow the submission but update the existing record
        // Here we just signal that the user already has a pending or completed form
        return;
      }
      throw new Error(`A form with this registration number already exists (Status: ${data.status})`);
    }
  }

  async createDepartmentStatuses(formId) {
    // Fetch active departments
    const { data: departments, error } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !departments || departments.length === 0) {
      console.warn('⚠️ No active departments found in configuration. Forms may have empty status list.');
      return;
    }

    // Create status records
    const statusRecords = departments.map(dept => ({
      form_id: formId,
      department_name: dept.name,
      status: 'pending'
    }));

    const { error: insertError } = await supabase
      .from('no_dues_status')
      .insert(statusRecords);

    if (insertError) {
      console.error('Error creating department statuses:', insertError);
      throw new Error(insertError.message);
    }
  }

  async syncStudentData(formId, formData) {
    const studentData = {
      form_id: formId,
      registration_no: formData.registration_no.toUpperCase(),
      student_name: formData.student_name,
      parent_name: formData.parent_name,
      school: formData.school_name || '',
      course: formData.course_name || '',
      branch: formData.branch_name || '',
      contact_no: formData.contact_no,
      personal_email: formData.personal_email,
      college_email: formData.college_email,
      admission_year: formData.admission_year,
      passing_year: formData.passing_year,
      alumni_profile_link: formData.alumni_profile_link,
      updated_at: new Date().toISOString(),
      updated_by: 'student_submission'
    };

    // Try to upsert into StudentData table
    const { error } = await supabase
      .from('student_data')
      .upsert(studentData, { onConflict: 'form_id' });

    if (error) {
      console.error('Error syncing student data:', error);
      // Don't throw error as this shouldn't block the main operation
    }
  }

  async triggerRealtimeUpdate(eventType, data) {
    // Use the Unified Realtime Service to broadcast
    try {
      await realtimeService.sendNotification(eventType, data);
    } catch (e) {
      console.warn('Realtime update failed to trigger', e);
    }
  }

  // Placeholders for email service integrations
  async sendInitialNotifications(form) { /* Implementation */ }
  async sendCertificateReadyNotification(form) { /* Implementation */ }
  async sendRejectionNotifications(form, dept, reason) { /* Implementation */ }
}

export default new ApplicationService();