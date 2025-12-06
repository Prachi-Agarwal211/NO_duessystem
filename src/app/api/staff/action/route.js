import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyRole, badRequestResponse } from '@/lib/authHelpers';
import { updateDepartmentStatus, canActOnDepartment } from '@/lib/departmentActions';

export async function PUT(request) {
  try {
    const body = await request.json();
    const { formId, departmentName, action, reason, userId } = body;

    // Validate required fields
    if (!formId || !departmentName || !action || !userId) {
      return badRequestResponse('Missing required fields: formId, departmentName, action, userId');
    }

    // Verify user role and get profile
    const roleCheck = await verifyRole(userId, ['department', 'admin']);
    if (roleCheck.error) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status });
    }

    const { profile } = roleCheck;

    // Verify user can act on this department
    if (!canActOnDepartment(profile, departmentName)) {
      return NextResponse.json({
        success: false,
        error: 'You can only take actions for your own department'
      }, { status: 403 });
    }

    // Use shared service to process the action
    const result = await updateDepartmentStatus({
      formId,
      departmentName,
      action,
      userId,
      reason
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // Note: Email notification currently disabled for Phase 1
    // To enable: Add student_email field to no_dues_forms table
    console.log('ℹ️ Phase 1: Student email notifications disabled (no student_email field)');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Staff Action API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}