export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PUT(request) {
  try {
    // Rate limiting
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.ACTION);
    if (!rateLimitCheck.success) {
      return NextResponse.json(
        { error: rateLimitCheck.error || 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Authentication
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

    const authUserId = user.id;

    // Parse and validate request body
    const body = await request.json();
    const { formActions } = body; // Array of { formId, departmentName }

    // Basic validation
    if (!Array.isArray(formActions) || formActions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'formActions must be a non-empty array' },
        { status: 400 }
      );
    }

    if (formActions.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Cannot process more than 100 forms at once' },
        { status: 400 }
      );
    }

    // Validate each form action has required fields
    for (const action of formActions) {
      if (!action.formId || !action.departmentName) {
        return NextResponse.json(
          { success: false, error: 'Each form action must have formId and departmentName' },
          { status: 400 }
        );
      }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, assigned_department_ids, department_name, full_name')
      .eq('id', authUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: 'Profile not found'
      }, { status: 404 });
    }

    const userId = profile.id;

    // Verify user has department staff or admin role
    if (profile.role !== 'department' && profile.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get all unique department names and verify authorization
    const uniqueDepartments = [...new Set(formActions.map(a => a.departmentName))];
    
    const { data: departments, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('id, name, display_name')
      .in('name', uniqueDepartments);

    if (deptError || !departments || departments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid departments'
      }, { status: 400 });
    }

    // Verify user is authorized for all departments
    if (profile.role === 'department') {
      const departmentIds = departments.map(d => d.id);
      const unauthorizedDepts = departmentIds.filter(
        deptId => !profile.assigned_department_ids?.includes(deptId)
      );
      
      if (unauthorizedDepts.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'You are not authorized to manage one or more of the selected departments'
        }, { status: 403 });
      }
    }

    // Get all form IDs
    const formIds = formActions.map(a => a.formId);

    // Verify all forms exist
    const { data: forms, error: formsError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, student_name, registration_no')
      .in('id', formIds);

    if (formsError || !forms || forms.length !== formIds.length) {
      return NextResponse.json({
        success: false,
        error: 'One or more forms not found'
      }, { status: 404 });
    }

    // Get all status records that need to be updated
    const statusQueries = formActions.map(action => ({
      form_id: action.formId,
      department_name: action.departmentName
    }));

    // Build complex query to get all matching statuses
    let statusQuery = supabaseAdmin
      .from('no_dues_status')
      .select('id, status, department_name, form_id');

    // Add OR conditions for each form-department pair
    const orConditions = formActions.map(action => 
      `and(form_id.eq.${action.formId},department_name.eq.${action.departmentName})`
    ).join(',');
    
    statusQuery = statusQuery.or(orConditions);

    const { data: statusRecords, error: statusError } = await statusQuery;

    if (statusError) {
      console.error('Status query error:', statusError);
      return NextResponse.json({
        success: false,
        error: 'Error querying department statuses'
      }, { status: 500 });
    }

    // Filter to only pending statuses
    const pendingStatuses = statusRecords?.filter(status => status.status === 'pending') || [];

    if (pendingStatuses.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No pending forms found for the selected items'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData = {
      status: 'approved',
      action_at: new Date().toISOString(),
      action_by_user_id: userId
    };

    // Update all pending statuses in a single query
    const { error: updateError } = await supabaseAdmin
      .from('no_dues_status')
      .update(updateData)
      .in('id', pendingStatuses.map(s => s.id));

    if (updateError) {
      console.error('Bulk update error:', updateError);
      return NextResponse.json({
        success: false,
        error: updateError.message
      }, { status: 500 });
    }

    console.log(`✅ Bulk approved ${pendingStatuses.length} forms for user ${userId}`);

    return NextResponse.json({
      success: true,
      data: {
        message: `Successfully approved ${pendingStatuses.length} forms`,
        processedCount: pendingStatuses.length,
        skippedCount: formActions.length - pendingStatuses.length
      }
    });
  } catch (error) {
    console.error('Bulk Staff Action API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}