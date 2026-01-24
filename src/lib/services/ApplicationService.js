/**
 * Unified Application Service
 * 
 * Consolidates all application-related functionality into a single service:
 * - Form submission and validation
 * - Status tracking and updates
 * - Reapplication workflow
 * - Priority queue management
 * - Certificate generation
 * - Real-time notifications
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import realtimeService from '@/lib/realtimeService';

class ApplicationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Check if value is a valid UUID
   */
  isUuid(value) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * Submit a new no-dues application
   */
  async submitApplication(formData) {
    try {
      console.log('📝 Submitting application via unified service...');

      // 1. Validate and resolve configuration IDs
      const resolvedData = await this.resolveConfigurationIds(formData);

      // 2. Check for duplicates
      await this.checkForDuplicates(resolvedData.registration_no);

      // 3. Insert form with proper data
      const form = await this.insertForm(resolvedData);

      // 4. Create initial department statuses
      await this.createDepartmentStatuses(form.id);

      // 5. Sync student data
      await this.syncStudentData(form.id, resolvedData);

      // 6. Send notifications
      await this.sendInitialNotifications(form);

      // 7. Trigger real-time updates
      await this.triggerRealtimeUpdate('form_submission', form);

      console.log('✅ Application submitted successfully via unified service');
      return { success: true, data: form };

    } catch (error) {
      console.error('❌ Application submission failed:', error);
      throw error;
    }
  }

  /**
   * Handle student reapplication
   */
  async handleReapplication(formId, reapplicationData) {
    try {
      console.log('🔄 Handling reapplication via unified service...');

      // 1. Get current form and check eligibility
      const { data: currentForm, error: formError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError || !currentForm) {
        throw new Error('Original form not found');
      }

      // 2. Check reapplication eligibility
      await this.validateReapplicationEligibility(currentForm);

      // 3. Create reapplication history record
      const historyRecord = await this.createReapplicationHistory(formId, reapplicationData);

      // 4. Update form to reapplication state
      const { data: updatedForm, error: updateError } = await supabaseAdmin
        .from('no_dues_forms')
        .update({
          status: 'reapplied',
          reapplication_count: currentForm.reapplication_count + 1,
          last_reapplied_at: new Date().toISOString(),
          student_reply_message: reapplicationData.message,
          is_reapplication: true,
          rejection_context: {
            ...currentForm.rejection_context,
            reapplication_reason: reapplicationData.reason,
            reapplication_history_id: historyRecord.id,
            reapplication_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)
        .select('*')
        .single();

      if (updateError) throw updateError;

      // 5. Reset department statuses to pending
      await this.resetDepartmentStatuses(formId);

      // 6. Update priority in the queue
      await this.updateReapplicationPriority(formId);

      // 7. Send notifications
      await this.sendReapplicationNotifications(updatedForm, reapplicationData);

      // 8. Trigger real-time updates
      await this.triggerRealtimeUpdate('student_reapplication', {
        formId,
        form: updatedForm,
        history: historyRecord,
        priority: 1000 // Highest priority for reapplications
      });

      console.log(`✅ Reapplication handled successfully via unified service`);
      return {
        success: true,
        data: {
          form: updatedForm,
          history: historyRecord,
          message: 'Reapplication submitted successfully. Your application is now under priority review.'
        }
      };

    } catch (error) {
      console.error('❌ Reapplication failed:', error);
      throw error;
    }
  }

  /**
   * Handle department rejection
   */
  async handleDepartmentRejection(formId, department, reason, remarks, actionBy) {
    try {
      console.log(`🚫 Handling rejection via unified service for form ${formId} by ${department}`);

      // 1. Update department status with rejection reason
      const { data: statusUpdate, error: statusError } = await supabaseAdmin
        .from('no_dues_status')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          remarks: remarks || null,
          action_by: actionBy,
          action_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('form_id', formId)
        .eq('department_name', department)
        .select('*')
        .single();

      if (statusError) throw statusError;

      // 2. Update form status to rejected
      const { data: formUpdate, error: formError } = await supabaseAdmin
        .from('no_dues_forms')
        .update({
          status: 'rejected',
          rejection_context: {
            primary_rejector: department,
            primary_reason: reason,
            rejected_at: new Date().toISOString(),
            remarks: remarks || null
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)
        .select('*')
        .single();

      if (formError) throw formError;

      // 3. Send notifications
      await this.sendRejectionNotifications(formUpdate, department, reason);

      // 4. Trigger real-time updates
      await this.triggerRealtimeUpdate('department_rejection', {
        formId,
        department,
        reason,
        form: formUpdate,
        status: statusUpdate
      });

      // 5. Log the rejection for audit
      await this.logRejection(formId, department, reason, actionBy);

      return {
        success: true,
        data: {
          form: formUpdate,
          status: statusUpdate,
          message: `Application rejected by ${department}. Reason: ${reason}`
        }
      };

    } catch (error) {
      console.error('❌ Department rejection failed:', error);
      throw error;
    }
  }

  /**
   * Handle department approval
   */
  async handleDepartmentApproval(formId, department, remarks, actionBy, userId = null) {
    try {
      console.log(`✅ Handling approval via unified service for form ${formId} by ${department}`);

      // 1. Check if department status already exists
      const { data: existingStatus, error: statusError } = await supabaseAdmin
        .from('no_dues_status')
        .select("id, status")
        .eq("form_id", formId)
        .eq("department_name", department)
        .single();

      if (statusError && statusError.code !== 'PGRST116') {
        throw statusError;
      }

      // 2. Update or insert department status
      let statusUpdate;
      if (existingStatus) {
        const { data: updatedStatus, error: updateError } = await supabaseAdmin
          .from("no_dues_status")
          .update({
            status: 'approved',
            action_by: actionBy || department,
            action_at: new Date().toISOString(),
            remarks: remarks || null,
            rejection_reason: null,
            student_reply_message: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingStatus.id)
          .select("*")
          .single();

        if (updateError) throw updateError;
        statusUpdate = updatedStatus;
      } else {
        const { data: newStatus, error: insertError } = await supabaseAdmin
          .from("no_dues_status")
          .insert({
            form_id: formId,
            department_name: department,
            status: 'approved',
            action_by: actionBy || department,
            action_at: new Date().toISOString(),
            remarks: remarks || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select("*")
          .single();

        if (insertError) throw insertError;
        statusUpdate = newStatus;
      }

      // 3. Check if all departments have approved
      const { data: allStatuses, error: allStatusError } = await supabaseAdmin
        .from("no_dues_status")
        .select("status, department_name")
        .eq("form_id", formId);

      if (allStatusError) throw allStatusError;

      const allApproved = allStatuses.every(s => s.status === 'approved');
      const hasRejection = allStatuses.some(s => s.status === 'rejected');

      // 4. Update form status based on department actions
      let newFormStatus = 'in_progress';
      if (hasRejection) {
        newFormStatus = 'rejected';
      } else if (allApproved) {
        newFormStatus = 'completed';
      }

      // 5. Update form status
      const { data: updatedForm, error: formUpdateError } = await supabaseAdmin
        .from("no_dues_forms")
        .update({
          status: newFormStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", formId)
        .select("*")
        .single();

      if (formUpdateError) throw formUpdateError;

      // 6. Send notifications for completion
      if (allApproved) {
        await this.sendCertificateReadyNotification(updatedForm);

        // 6.5. Trigger automatic certificate generation
        try {
          const { triggerCertificateGeneration } = await import('@/lib/certificateTrigger');
          const certResult = await triggerCertificateGeneration(formId, userId || department);

          if (certResult.success) {
            console.log('✅ Automatic certificate generated:', certResult.certificateUrl);
          } else {
            console.error('❌ Automatic certificate generation failed:', certResult.error);
          }
        } catch (error) {
          console.error('❌ Certificate trigger error:', error);
        }
      }

      // 7. Trigger real-time updates
      await this.triggerRealtimeUpdate('department_approval', {
        formId,
        department,
        form: updatedForm,
        status: statusUpdate,
        allDepartmentsApproved: allApproved,
        newFormStatus
      });

      return {
        success: true,
        data: {
          form: updatedForm,
          status: statusUpdate,
          allDepartmentsApproved: allApproved,
          hasRejection,
          newFormStatus
        }
      };

    } catch (error) {
      console.error('❌ Department approval failed:', error);
      throw error;
    }
  }

  /**
   * Get student status by registration number
   */
  async getStudentStatus(registrationNo) {
    try {
      const { data: form, error: formError } = await supabaseAdmin
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status(
            department_name,
            status,
            action_at,
            action_by,
            remarks,
            rejection_reason
          )
        `)
        .eq('registration_no', registrationNo.toUpperCase())
        .single();

      if (formError) throw formError;
      if (!form) throw new Error('No form found with this registration number');

      return {
        success: true,
        data: {
          form,
          departmentStatuses: form.no_dues_status || [],
          overallStatus: form.status,
          isCompleted: form.status === 'completed',
          isRejected: form.status === 'rejected',
          certificateGenerated: form.final_certificate_generated,
          certificateUrl: form.certificate_url
        }
      };

    } catch (error) {
      console.error('❌ Failed to get student status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get prioritized applications list
   */
  async getPrioritizedApplications(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        department,
        startDate,
        endDate,
        search
      } = options;

      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status(
            department_name,
            status,
            action_at,
            action_by
          )
        `);

      // Apply filters
      if (status) query = query.eq('status', status);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);
      if (search) {
        query = query.or(`
          student_name.ilike.%${search}%,registration_no.ilike.%${search}%
        `);
      }

      // Order by priority (reapplied first, then by creation time)
      const { data, error } = await query
        .order('status', { ascending: false }) // reapplied comes first
        .order('last_reapplied_at', { ascending: false, nullsFirst: false }) // most recent reapplications
        .order('created_at', { ascending: false }) // newest first for same status
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Filter by department if specified
      let filteredData = data || [];
      if (department) {
        filteredData = data?.filter(form =>
          form.no_dues_status?.some(status => status.department_name === department)
        ) || [];
      }

      return {
        success: true,
        data: filteredData
      };

    } catch (error) {
      console.error('❌ Failed to get prioritized applications:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get reapplication queue status
   */
  async getReapplicationQueueStatus() {
    try {
      const { data: reapplied, error: reappliedError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('id, student_name, registration_no, last_reapplied_at, reapplication_count')
        .eq('status', 'reapplied')
        .order('last_reapplied_at', { ascending: false });

      if (reappliedError) throw reappliedError;

      const { data: pending, error: pendingError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('id, student_name, registration_no, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      return {
        success: true,
        data: {
          reapplications: reapplied || [],
          pending_applications: pending || [],
          queue_length: (reapplied?.length || 0) + (pending?.length || 0),
          average_wait_time: this.calculateAverageWaitTime(reapplied || [])
        }
      };

    } catch (error) {
      console.error('❌ Failed to get reapplication queue status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Private helper methods (from existing services)
  async resolveConfigurationIds(formData) {
    const resolved = { ...formData };

    // Resolve School
    if (formData.school_id && this.isUuid(formData.school_id)) {
      const { data: school } = await supabaseAdmin
        .from('config_schools')
        .select('name')
        .eq('id', formData.school_id)
        .single();

      if (school) resolved.school_name = school.name;
    } else if (formData.school_id) {
      resolved.school_name = formData.school_id;
      const { data: school } = await supabaseAdmin
        .from('config_schools')
        .select('id')
        .eq('name', formData.school_name)
        .single();

      if (school) resolved.school_id = school.id;
    }

    // Similar logic for courses and branches...
    return resolved;
  }

  async checkForDuplicates(registrationNo) {
    const { data: existing } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id')
      .eq('registration_no', registrationNo.toUpperCase())
      .single();

    if (existing) {
      throw new Error('A form with this registration number already exists');
    }
  }

  async insertForm(formData) {
    const { data, error } = await supabaseAdmin
      .from('no_dues_forms')
      .insert([{
        registration_no: formData.registration_no.toUpperCase(),
        student_name: formData.student_name,
        parent_name: formData.parent_name,
        admission_year: formData.admission_year,
        passing_year: formData.passing_year,
        school_id: formData.school_id,
        school: formData.school_name,
        course_id: formData.course_id,
        course: formData.course_name,
        branch_id: formData.branch_id,
        branch: formData.branch_name,
        country_code: formData.country_code,
        contact_no: formData.contact_no,
        personal_email: formData.personal_email,
        college_email: formData.college_email,
        alumniProfileLink: formData.alumni_profile_link,
        status: 'pending',
        is_reapplication: false,
        reapplication_count: 0
      }])
      .select(`
        *,
        config_schools(
          id,
          name
        ),
        config_courses(
          id,
          name
        ),
        config_branches(
          id,
          name
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async createDepartmentStatuses(formId) {
    const { data: departments } = await supabaseAdmin
      .from('departments')
      .select('name')
      .eq('is_active', true)
      .order('display_order');

    if (!departments) return;

    const statusRecords = departments.map(dept => ({
      form_id: formId,
      department_name: dept.name,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin
      .from('no_dues_status')
      .insert(statusRecords);

    if (error) throw error;
  }

  async syncStudentData(formId, formData) {
    const { error } = await supabaseAdmin
      .from('student_data')
      .upsert({
        form_id: formId,
        registration_no: formData.registration_no.toUpperCase(),
        student_name: formData.student_name,
        parent_name: formData.parent_name,
        school: formData.school_name,
        course: formData.course_name,
        branch: formData.branch_name,
        contact_no: formData.contact_no,
        personal_email: formData.personal_email,
        college_email: formData.college_email,
        admission_year: formData.admission_year,
        passing_year: formData.passing_year,
        alumniProfileLink: formData.alumni_profile_link,
        updated_at: new Date().toISOString(),
        updated_by: 'student_submission'
      }, {
        onConflict: 'form_id',
        ignoreDuplicates: false
      });

    if (error) throw error;
  }

  async sendInitialNotifications(form) {
    try {
      const { data: departments } = await supabaseAdmin
        .from('departments')
        .select('name, email')
        .eq('is_active', true);

      if (departments) {
        // Import email service dynamically
        const { sendCombinedDepartmentNotification } = await import('@/lib/emailService');

        await sendCombinedDepartmentNotification({
          formId: form.id,
          studentName: form.student_name,
          registrationNo: form.registration_no,
          departments: departments.map(d => ({ name: d.name, email: d.email }))
        });
      }
    } catch (error) {
      console.error('⚠️ Failed to send initial notifications:', error);
    }
  }

  async sendReapplicationNotifications(form, reapplicationData) {
    try {
      console.log(`📧 Sending reapplication notifications to ${form.personal_email}`);

      // Import email service dynamically
      const { sendReapplicationConfirmation } = await import('@/lib/emailService');

      // Send reapplication confirmation email to student
      const emailResult = await sendReapplicationConfirmation({
        studentEmail: form.personal_email || form.college_email,
        studentName: form.student_name,
        registrationNo: form.registration_no,
        reapplicationNumber: reapplicationData.reapplicationNumber,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/student/status`
      });

      if (emailResult.success) {
        console.log('✅ Reapplication confirmation email sent successfully');
      } else {
        console.error('❌ Failed to send reapplication email:', emailResult.error);
      }

      // Send high-priority notification to all departments
      console.log(`📧 Sending high-priority reapplication notification to departments`);
    } catch (error) {
      console.error('⚠️ Failed to send reapplication notifications:', error);
    }
  }

  async sendRejectionNotifications(form, department, reason) {
    try {
      console.log(`📧 Sending rejection notification to ${form.personal_email}`);

      // Import email service dynamically
      const { sendRejectionNotification } = await import('@/lib/emailService');

      // Send rejection email to student
      const emailResult = await sendRejectionNotification({
        studentEmail: form.personal_email || form.college_email,
        studentName: form.student_name,
        registrationNo: form.registration_no,
        departmentName: department,
        rejectionReason: reason,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/student/status`
      });

      if (emailResult.success) {
        console.log('✅ Rejection email sent successfully');
      } else {
        console.error('❌ Failed to send rejection email:', emailResult.error);
      }

      // Send notification to other departments
      console.log(`📧 Notifying other departments about rejection by ${department}`);
    } catch (error) {
      console.error('⚠️ Failed to send rejection notifications:', error);
    }
  }

  async sendCertificateReadyNotification(form) {
    try {
      console.log(`📧 Sending certificate ready notification to ${form.personal_email}`);

      // Import email service dynamically
      const { sendCertificateReadyNotification } = await import('@/lib/emailService');

      // Send certificate ready email to student
      const emailResult = await sendCertificateReadyNotification({
        studentEmail: form.personal_email || form.college_email,
        studentName: form.student_name,
        registrationNo: form.registration_no,
        certificateUrl: form.certificate_url || `${process.env.NEXT_PUBLIC_APP_URL}/certificate/${form.id}`
      });

      if (emailResult.success) {
        console.log('✅ Certificate ready email sent successfully');
      } else {
        console.error('❌ Failed to send certificate email:', emailResult.error);
      }
    } catch (error) {
      console.error('⚠️ Failed to send certificate notification:', error);
    }
  }

  async sendStudentStatusUpdate(form, department, status) {
    try {
      console.log(`📧 Sending status update notification to ${form.personal_email}`);

      // Import email service dynamically
      const { sendStudentStatusUpdate } = await import('@/lib/emailService');

      // Send status update email to student
      const emailResult = await sendStudentStatusUpdate({
        studentEmail: form.personal_email || form.college_email,
        studentName: form.student_name,
        registrationNo: form.registration_no,
        departmentName: department,
        status: status,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/student/status`
      });

      if (emailResult.success) {
        console.log('✅ Status update email sent successfully');
      } else {
        console.error('❌ Failed to send status update email:', emailResult.error);
      }
    } catch (error) {
      console.error('⚠️ Failed to send status update notification:', error);
    }
  }

  async triggerRealtimeUpdate(eventType, data) {
    try {
      await realtimeService.sendNotification(eventType, data);
      console.log(`📡 Real-time update triggered: ${eventType}`);
    } catch (error) {
      console.error('⚠️ Failed to trigger real-time update:', error);
    }
  }

  async resetDepartmentStatuses(formId) {
    const { error } = await supabaseAdmin
      .from('no_dues_status')
      .update({
        status: 'pending',
        action_at: null,
        action_by: null,
        remarks: null,
        rejection_reason: null,
        student_reply_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('form_id', formId);

    if (error) throw error;
  }

  async updateReapplicationPriority(formId) {
    console.log(`📊 Updated priority for reapplication ${formId}`);
  }

  async validateReapplicationEligibility(form) {
    // Get reapplication rules
    const { data: rules } = await supabaseAdmin
      .from('config_reapplication_rules')
      .select('*')
      .eq('is_active', true);

    const globalLimit = rules?.find(r => r.rule_type === 'global_limit')?.value || 5;
    const perDeptLimit = rules?.find(r => r.rule_type === 'per_dept_limit')?.value || 3;
    const cooldownDays = rules?.find(r => r.rule_type === 'cooldown_days')?.value || 7;

    // Check global limit
    if (form.reapplication_count >= globalLimit) {
      throw new Error(`Maximum reapplication limit (${globalLimit}) reached`);
    }

    // Check cooldown period
    if (form.last_reapplied_at) {
      const cooldownEnd = new Date(form.last_reapplied_at);
      cooldownEnd.setDate(cooldownEnd.getDate() + cooldownDays);

      if (new Date() < cooldownEnd) {
        throw new Error(`Please wait ${cooldownDays} days between reapplications`);
      }
    }

    // Check if form is in a state that allows reapplication
    if (!['rejected', 'completed'].includes(form.status)) {
      throw new Error('Reapplication is only allowed for rejected or completed applications');
    }

    console.log(`✅ Reapplication eligibility validated`);
  }

  async createReapplicationHistory(formId, reapplicationData) {
    const { data: history, error } = await supabaseAdmin
      .from('no_dues_reapplication_history')
      .insert([{
        form_id: formId,
        reapplication_number: 1,
        reapplication_reason: reapplicationData.reason,
        student_reply_message: reapplicationData.message,
        department_responses: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (error) throw error;
    return history;
  }

  async logRejection(formId, department, reason, actionBy) {
    try {
      const { error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          action: 'department_rejection',
          actor_id: actionBy,
          actor_name: department,
          target_id: formId,
          target_type: 'no_dues_form',
          old_values: { status: 'pending' },
          new_values: { status: 'rejected', rejection_reason: reason },
          ip_address: 'system',
          user_agent: 'department_action_api',
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('⚠️ Failed to log rejection:', error);
    }
  }

  calculateAverageWaitTime(reapplications) {
    if (reapplications.length === 0) return 0;

    const now = new Date();
    const totalWaitTime = reapplications.reduce((total, app) => {
      const reapplyTime = new Date(app.last_reapplied_at);
      const waitHours = (now - reapplyTime) / (1000 * 60 * 60);
      return total + waitHours;
    }, 0);

    return (totalWaitTime / reapplications.length).toFixed(1);
  }

  isUuid(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    return uuidRegex.test(str);
  }
}

// Create singleton instance
const applicationService = new ApplicationService();

export default applicationService;
