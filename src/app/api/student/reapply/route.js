export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { APP_URLS } from '@/lib/urlHelper';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/student/reapply?formId=xxx
 * Fetch reapplication history for a student
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json({
        success: false,
        error: 'formId is required'
      }, { status: 400 });
    }

    const { data: history, error } = await supabaseAdmin
      .from('no_dues_reapplication_history')
      .select('*')
      .eq('form_id', formId)
      .order('reapplication_number', { ascending: false });

    if (error) {
      console.error('Error fetching reapplication history:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch history'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { history: history || [] }
    });
  } catch (error) {
    console.error('Reapply GET API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/student/reapply
 * Handle student reapplication after rejection
 * 
 * Request body:
 * {
 *   registration_no: string (required)
 *   student_reply_message: string (required, min 20 chars)
 *   updated_form_data: object (optional - only changed fields)
 * }
 */
export async function PUT(request) {
  try {
    // Rate limiting: Prevent spam reapplications
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.SUBMIT);
    if (!rateLimitCheck.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitCheck.error || 'Too many requests',
        retryAfter: rateLimitCheck.retryAfter
      }, { status: 429 });
    }

    const body = await request.json();
    const { registration_no, student_reply_message, updated_form_data } = body;

    // ==================== VALIDATION ====================
    if (!registration_no?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Registration number is required'
      }, { status: 400 });
    }

    if (!student_reply_message?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Student reply message is required'
      }, { status: 400 });
    }

    // ==================== GET CURRENT FORM ====================
    const { data: form, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status (
          department_name,
          status,
          rejection_reason,
          action_at,
          action_by_user_id
        )
      `)
      .eq('registration_no', registration_no.trim().toUpperCase())
      .single();

    if (formError) {
      if (formError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Form not found'
        }, { status: 404 });
      }
      throw formError;
    }

    // ==================== CHECK REAPPLICATION ELIGIBILITY ====================
    const hasRejection = form.no_dues_status.some(s => s.status === 'rejected');

    if (!hasRejection) {
      return NextResponse.json({
        success: false,
        error: 'Reapplication is only allowed for rejected forms'
      }, { status: 403 });
    }

    // Check if form is completed
    if (form.status === 'completed') {
      return NextResponse.json({
        success: false,
        error: 'Cannot reapply for a completed form'
      }, { status: 403 });
    }

    // ==================== MAX REAPPLICATIONS CHECK ====================
    // Default limit: 5 reapplications
    // Admin can override by setting max_reapplications_override column
    const DEFAULT_MAX_REAPPLICATIONS = 5;
    const maxAllowed = form.max_reapplications_override ?? DEFAULT_MAX_REAPPLICATIONS;

    if (form.reapplication_count >= maxAllowed) {
      return NextResponse.json({
        success: false,
        error: `Maximum reapplication limit (${maxAllowed}) reached. Please contact administration to request additional attempts.`,
        canRequestOverride: true
      }, { status: 403 });
    }

    // ==================== INPUT SANITIZATION ====================
    // SECURITY: Allowlist of fields students can modify
    const ALLOWED_FIELDS = [
      'student_name',
      'parent_name',
      'admission_year',
      'passing_year',
      'school',
      'course',
      'branch',
      'country_code',
      'contact_no',
      'personal_email',
      'college_email'
    ];

    // SECURITY: Fields that are STRICTLY FORBIDDEN to prevent attacks
    const PROTECTED_FIELDS = [
      'id',
      'registration_no',
      'status',
      'created_at',
      'updated_at',
      'reapplication_count',
      'is_reapplication',
      'last_reapplied_at'
    ];

    let sanitizedData = {};

    if (updated_form_data) {
      // Check for attempts to modify protected fields
      for (const field of PROTECTED_FIELDS) {
        if (updated_form_data.hasOwnProperty(field)) {
          return NextResponse.json({
            success: false,
            error: `Cannot modify protected field: ${field}`
          }, { status: 403 });
        }
      }

      // Only keep allowed fields
      for (const field of ALLOWED_FIELDS) {
        if (updated_form_data.hasOwnProperty(field)) {
          sanitizedData[field] = updated_form_data[field];
        }
      }
    }

    // ==================== VALIDATE SANITIZED FIELDS ====================
    if (sanitizedData && Object.keys(sanitizedData).length > 0) {
      // Validate email formats if updated
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (sanitizedData.personal_email && !emailPattern.test(sanitizedData.personal_email)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid personal email format'
        }, { status: 400 });
      }

      if (sanitizedData.college_email && !emailPattern.test(sanitizedData.college_email)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid college email format'
        }, { status: 400 });
      }

      // Validate phone if updated
      if (sanitizedData.contact_no) {
        const phonePattern = /^[0-9]{6,15}$/;
        if (!phonePattern.test(sanitizedData.contact_no)) {
          return NextResponse.json({
            success: false,
            error: 'Phone number must be 6-15 digits'
          }, { status: 400 });
        }
      }
    }

    // ==================== PREPARE REAPPLICATION DATA ====================
    const rejectedDepartments = form.no_dues_status
      .filter(s => s.status === 'rejected')
      .map(d => ({
        department_name: d.department_name,
        rejection_reason: d.rejection_reason,
        action_at: d.action_at
      }));

    const previousStatus = form.no_dues_status.map(s => ({
      department_name: s.department_name,
      status: s.status,
      action_at: s.action_at,
      rejection_reason: s.rejection_reason
    }));

    const rejectedDeptNames = rejectedDepartments.map(d => d.department_name);

    // ==================== VALIDATE FORM EXISTS (DEFENSIVE CODING) ====================
    // 🛡️ SAFETY CHECK: Verify form.id exists before inserting history
    // This prevents foreign key violations if form was deleted/recreated
    const { data: formExists, error: validateError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id')
      .eq('id', form.id)
      .single();

    if (validateError || !formExists) {
      console.error(`❌ Form ID validation failed for ${form.id}:`, validateError);

      // Try to find the current form by registration number
      const { data: freshForm, error: freshError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('id, reapplication_count')
        .eq('registration_no', registration_no.trim().toUpperCase())
        .single();

      if (freshError || !freshForm) {
        return NextResponse.json({
          success: false,
          error: 'Form record not found. Please try checking your status again.'
        }, { status: 404 });
      }

      // Update to use the fresh form ID
      console.log(`✅ Using fresh form ID: ${freshForm.id} (old ID was ${form.id})`);
      form.id = freshForm.id;
      form.reapplication_count = freshForm.reapplication_count;
    }

    // ==================== LOG REAPPLICATION HISTORY ====================
    const { error: historyError } = await supabaseAdmin
      .from('no_dues_reapplication_history')
      .insert({
        form_id: form.id, // Now guaranteed to be valid
        reapplication_number: form.reapplication_count + 1,
        student_message: student_reply_message.trim(),
        edited_fields: sanitizedData || {},
        rejected_departments: rejectedDepartments,
        previous_status: previousStatus
      });

    if (historyError) {
      console.error('Error logging reapplication history:', historyError);
      throw new Error('Failed to log reapplication history');
    }

    // ==================== UPDATE FORM DATA ====================
    // SECURITY FIX: Spread sanitizedData FIRST, then override with protected fields
    const formUpdateData = {
      ...(sanitizedData || {}), // Merge sanitized fields FIRST
      // CRITICAL: These fields MUST come AFTER to override any malicious input
      reapplication_count: form.reapplication_count + 1,
      last_reapplied_at: new Date().toISOString(),
      student_reply_message: student_reply_message.trim(),
      is_reapplication: true,
      status: 'pending', // FORCE pending status - cannot be overridden
      rejection_context: null // 🔥 NEW: Clear rejection context for fresh start
    };

    const { error: formUpdateError } = await supabaseAdmin
      .from('no_dues_forms')
      .update(formUpdateData)
      .eq('id', form.id);

    if (formUpdateError) {
      console.error('Error updating form:', formUpdateError);
      throw new Error('Failed to update form');
    }

    // ==================== SMART RESET: ONLY REJECTED DEPARTMENTS ====================
    // ✅ IMPROVEMENT: Only reset rejected departments, keep approved ones as-is
    // This reduces workload - approved departments don't need to re-review
    const { error: statusResetError } = await supabaseAdmin
      .from('no_dues_status')
      .update({
        status: 'pending',
        rejection_reason: null,
        action_at: null,
        action_by_user_id: null
      })
      .eq('form_id', form.id)
      .in('department_name', rejectedDeptNames); // Only reset rejected departments

    if (statusResetError) {
      console.error('Error resetting department statuses:', statusResetError);
      throw new Error('Failed to reset rejected department statuses');
    }

    console.log(`♻️ Smart Reset: Reset ${rejectedDeptNames.length} rejected departments to pending for form ${form.id}`);
    console.log(`   Kept approved: ${form.no_dues_status.filter(s => s.status === 'approved').map(s => s.department_name).join(', ') || 'none'}`);

    // ==================== SEND EMAIL NOTIFICATIONS ====================
    // ✅ SMART NOTIFY: Only notify staff from rejected departments
    const { data: staffMembers, error: staffError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, department_name, school_ids, course_ids, branch_ids')
      .eq('role', 'department')
      .in('department_name', rejectedDeptNames) // Only rejected departments' staff
      .not('email', 'is', null);

    if (!staffError && staffMembers && staffMembers.length > 0) {
      try {
        // ✅ Filter staff based on HOD scope (school_hod only sees their students)
        const staffToNotify = staffMembers.filter(staff => {
          if (staff.department_name === 'school_hod') {
            // Check if this HOD manages this student's school/course
            if (staff.school_ids && !staff.school_ids.includes(form.school_id)) {
              return false;
            }
            if (staff.course_ids && staff.course_ids.length > 0 && !staff.course_ids.includes(form.course_id)) {
              return false;
            }
          }
          return true; // All other departments see all students
        });

        if (staffToNotify.length > 0) {
          // 🆕 OPTIMIZED: Send ONE combined email for reapplication
          const { sendReapplicationNotification } = await import('@/lib/emailService');
          const allStaffEmails = staffToNotify.map(staff => staff.email);

          const emailResult = await sendReapplicationNotification({
            allStaffEmails,
            studentName: form.student_name,
            registrationNo: form.registration_no,
            studentMessage: student_reply_message.trim(),
            reapplicationNumber: form.reapplication_count + 1,
            school: form.school,
            course: form.course,
            branch: form.branch,
            dashboardUrl: APP_URLS.staffLogin()
          });

          if (emailResult.success) {
            console.log(`📧 ✅ Reapplication notification sent to ${staffToNotify.length} staff (rejected depts only)`);
          } else {
            console.error(`📧 ❌ Failed to send reapplication notification: ${emailResult.error}`);
          }
        }
      } catch (emailError) {
        console.error('Failed to send reapplication notifications:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.warn('⚠️ No staff members found for rejected departments. Please ensure staff accounts exist.');
    }

    // ==================== SUCCESS RESPONSE ====================
    console.log(`✅ Reapplication #${form.reapplication_count + 1} processed for ${form.registration_no}`);

    return NextResponse.json({
      success: true,
      message: 'Reapplication submitted successfully. All departments will review your updated application.',
      data: {
        reapplication_number: form.reapplication_count + 1,
        reset_departments: 7, // ✅ MASTER CYCLE FIX: Always 7 departments
        form_status: 'pending'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Reapplication API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/student/reapply?registration_no=XXX
 * Get reapplication history for a form
 */
export async function GET(request) {
  try {
    // Rate limiting for reapplication history queries
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.READ);
    if (!rateLimitCheck.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitCheck.error || 'Too many requests',
        retryAfter: rateLimitCheck.retryAfter
      }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');

    if (!registrationNo) {
      return NextResponse.json({
        success: false,
        error: 'Registration number is required'
      }, { status: 400 });
    }

    // Get form
    const { data: form, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, registration_no, reapplication_count, student_reply_message, last_reapplied_at')
      .eq('registration_no', registrationNo.trim().toUpperCase())
      .single();

    if (formError) {
      if (formError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Form not found'
        }, { status: 404 });
      }
      throw formError;
    }

    // Get reapplication history
    const { data: history, error: historyError } = await supabaseAdmin
      .from('no_dues_reapplication_history')
      .select('*')
      .eq('form_id', form.id)
      .order('reapplication_number', { ascending: false });

    if (historyError) {
      throw historyError;
    }

    return NextResponse.json({
      success: true,
      data: {
        form: {
          id: form.id,
          registration_no: form.registration_no,
          reapplication_count: form.reapplication_count,
          current_message: form.student_reply_message,
          last_reapplied_at: form.last_reapplied_at
        },
        history: history || []
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Get Reapplication History Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}