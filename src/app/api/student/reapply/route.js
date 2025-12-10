export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { validateRequest, VALIDATION_SCHEMAS } from '@/lib/validation';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }

    const body = await request.json();
    const { registration_no, student_reply_message, updated_form_data } = body;

    // Input validation for reapplication data
    const validation = await validateRequest(request, VALIDATION_SCHEMAS.REAPPLY);
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

    if (student_reply_message.trim().length < 20) {
      return NextResponse.json({
        success: false,
        error: 'Reply message must be at least 20 characters'
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

    // Optional: Limit number of reapplications
    const MAX_REAPPLICATIONS = 5;
    if (form.reapplication_count >= MAX_REAPPLICATIONS) {
      return NextResponse.json({
        success: false,
        error: `Maximum reapplication limit (${MAX_REAPPLICATIONS}) reached. Please contact administration.`
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

    // ==================== LOG REAPPLICATION HISTORY ====================
    const { error: historyError } = await supabaseAdmin
    .from('no_dues_reapplication_history')
    .insert({
      form_id: form.id,
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
      status: 'pending' // FORCE pending status - cannot be overridden
    };

    const { error: formUpdateError } = await supabaseAdmin
      .from('no_dues_forms')
      .update(formUpdateData)
      .eq('id', form.id);

    if (formUpdateError) {
      console.error('Error updating form:', formUpdateError);
      throw new Error('Failed to update form');
    }

    // ==================== RESET REJECTED DEPARTMENT STATUSES ====================
    const { error: statusResetError } = await supabaseAdmin
      .from('no_dues_status')
      .update({
        status: 'pending',
        rejection_reason: null,
        action_at: null,
        action_by_user_id: null
      })
      .eq('form_id', form.id)
      .in('department_name', rejectedDeptNames);

    if (statusResetError) {
      console.error('Error resetting department statuses:', statusResetError);
      throw new Error('Failed to reset department statuses');
    }

    // ==================== SEND EMAIL NOTIFICATIONS ====================
    // UNIFIED SYSTEM: Get all active staff members for rejected departments
    const { data: staffMembers, error: staffError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, department_name')
      .eq('role', 'department')
      .in('department_name', rejectedDeptNames)
      .not('email', 'is', null);

    if (!staffError && staffMembers && staffMembers.length > 0) {
      try {
        // Import email service
        const { sendReapplicationNotifications } = await import('@/lib/emailService');
        
        await sendReapplicationNotifications({
          staffMembers: staffMembers.map(staff => ({
            email: staff.email,
            name: staff.full_name,
            department: staff.department_name
          })),
          studentName: form.student_name,
          registrationNo: form.registration_no,
          studentMessage: student_reply_message.trim(),
          reapplicationNumber: form.reapplication_count + 1,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/staff/dashboard`,
          formUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/staff/student/${form.id}`
        });

        console.log(`📧 Reapplication notifications sent to ${staffMembers.length} staff member(s) in rejected departments`);
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
      message: 'Reapplication submitted successfully',
      data: {
        reapplication_number: form.reapplication_count + 1,
        reset_departments: rejectedDeptNames.length,
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
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
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
    });

  } catch (error) {
    console.error('Get Reapplication History Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}