export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/student/can-edit?registration_no=XXX
 * Check if a student can edit or reapply their form
 * 
 * Returns:
 * {
 *   canEdit: boolean,
 *   canReapply: boolean,
 *   reason: string,
 *   form_status: string,
 *   rejection_info: object
 * }
 */
export async function GET(request) {
  try {
    // Rate limiting: Prevent enumeration attacks
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.CHECK_STATUS);
    if (!rateLimitCheck.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitCheck.error || 'Too many status check attempts',
        retryAfter: rateLimitCheck.retryAfter
      }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');

    // ==================== VALIDATION ====================
    if (!registrationNo) {
      return NextResponse.json({
        success: false,
        error: 'Registration number is required'
      }, { status: 400 });
    }

    // ==================== GET FORM AND STATUS ====================
    const { data: form, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        status,
        reapplication_count,
        last_reapplied_at,
        student_reply_message,
        created_at,
        no_dues_status (
          department_name,
          status,
          rejection_reason,
          action_at
        )
      `)
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

    // ==================== ANALYZE ELIGIBILITY ====================
    const hasRejection = form.no_dues_status.some(s => s.status === 'rejected');
    const rejectedDepartments = form.no_dues_status.filter(s => s.status === 'rejected');
    const approvedDepartments = form.no_dues_status.filter(s => s.status === 'approved');
    const pendingDepartments = form.no_dues_status.filter(s => s.status === 'pending');

    // Determine if form is completed
    const isCompleted = form.status === 'completed';

    // Determine if can edit (pending or rejected forms only)
    const canEdit = form.status === 'pending' || form.status === 'rejected';

    // Determine if can reapply (must have at least one rejection and not completed)
    const canReapply = hasRejection && !isCompleted;

    // Check reapplication limit
    const MAX_REAPPLICATIONS = 5;
    const hasReachedLimit = form.reapplication_count >= MAX_REAPPLICATIONS;

    // Determine reason
    let reason = '';
    if (isCompleted) {
      reason = 'Form is already completed. No changes allowed.';
    } else if (hasReachedLimit) {
      reason = `Maximum reapplication limit (${MAX_REAPPLICATIONS}) reached.`;
    } else if (hasRejection) {
      reason = `${rejectedDepartments.length} department(s) rejected. You can reapply.`;
    } else if (form.status === 'pending') {
      reason = 'Form is pending review. You can edit to fix mistakes.';
    } else {
      reason = 'Form status does not allow editing.';
    }

    // ==================== PREPARE RESPONSE ====================
    const response = {
      success: true,
      data: {
        canEdit: canEdit && !hasReachedLimit,
        canReapply: canReapply && !hasReachedLimit,
        reason: reason,
        form_status: form.status,
        form_info: {
          registration_no: form.registration_no,
          student_name: form.student_name,
          created_at: form.created_at,
          reapplication_count: form.reapplication_count,
          last_reapplied_at: form.last_reapplied_at,
          has_student_message: !!form.student_reply_message
        },
        rejection_info: hasRejection ? {
          has_rejection: true,
          rejected_count: rejectedDepartments.length,
          approved_count: approvedDepartments.length,
          pending_count: pendingDepartments.length,
          rejected_departments: rejectedDepartments.map(d => ({
            department_name: d.department_name,
            rejection_reason: d.rejection_reason,
            action_at: d.action_at
          }))
        } : {
          has_rejection: false,
          approved_count: approvedDepartments.length,
          pending_count: pendingDepartments.length
        },
        limitations: {
          max_reapplications: MAX_REAPPLICATIONS,
          current_count: form.reapplication_count,
          remaining: Math.max(0, MAX_REAPPLICATIONS - form.reapplication_count),
          has_reached_limit: hasReachedLimit
        }
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Can Edit Check Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}