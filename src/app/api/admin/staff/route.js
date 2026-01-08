export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper: Verify admin user
async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { error: 'No authorization header', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { error: 'Invalid token', status: 401 };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: 'Unauthorized: Admin access required', status: 403 };
  }

  return { userId: user.id };
}

// GET - Fetch all department staff (with optional performance stats)
export async function GET(request) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (adminCheck.error) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const withStats = searchParams.get('withStats') === 'true';

    // Base query for staff profiles
    let query = supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, department_name, role, designation, avatar_url, school_ids, course_ids, branch_ids, is_active, created_at, last_active_at')
      .eq('role', 'department')
      .order('created_at', { ascending: false });

    if (department) {
      query = query.eq('department_name', department);
    }

    const { data: staffList, error } = await query;

    if (error) throw error;

    // If stats not requested, return basic list
    if (!withStats) {
      return NextResponse.json({ success: true, data: staffList || [] });
    }

    // Fetch department display names
    const { data: departments } = await supabaseAdmin
      .from('departments')
      .select('name, display_name');

    const deptMap = {};
    departments?.forEach(d => { deptMap[d.name] = d.display_name; });

    // Fetch all actions for stats aggregation
    const staffIds = staffList?.map(s => s.id) || [];

    if (staffIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data: allActions } = await supabaseAdmin
      .from('no_dues_status')
      .select('action_by_user_id, status, action_at')
      .in('action_by_user_id', staffIds)
      .not('action_at', 'is', null);

    // Aggregate stats per staff
    const statsMap = {};
    allActions?.forEach(action => {
      const id = action.action_by_user_id;
      if (!statsMap[id]) {
        statsMap[id] = { total: 0, approved: 0, rejected: 0, lastAction: null };
      }
      statsMap[id].total++;
      if (action.status === 'approved') statsMap[id].approved++;
      if (action.status === 'rejected') statsMap[id].rejected++;

      const actionDate = new Date(action.action_at);
      if (!statsMap[id].lastAction || actionDate > new Date(statsMap[id].lastAction)) {
        statsMap[id].lastAction = action.action_at;
      }
    });

    // Merge stats into staff list
    const enrichedData = staffList?.map(staff => {
      const stats = statsMap[staff.id] || { total: 0, approved: 0, rejected: 0, lastAction: null };
      return {
        ...staff,
        department_display: deptMap[staff.department_name] || staff.department_name,
        stats: {
          total_actions: stats.total,
          approved: stats.approved,
          rejected: stats.rejected,
          approval_rate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100 * 100) / 100 : 0,
          last_action_at: stats.lastAction
        }
      };
    }) || [];

    return NextResponse.json({ success: true, data: enrichedData });
  } catch (error) {
    console.error('GET staff error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch staff', data: [] },
      { status: 500 }
    );
  }
}

// POST - Create new department staff account
export async function POST(request) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (adminCheck.error) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const body = await request.json();

    // Validation
    if (!body.email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!body.password || body.password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (!body.full_name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Full name is required' },
        { status: 400 }
      );
    }

    if (!body.department_name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Department is required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser.users.some(u => u.email === body.email.trim());

    if (emailExists) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Verify department exists and get its ID
    const { data: department, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('id, name')
      .eq('name', body.department_name.trim())
      .single();

    if (deptError || !department) {
      return NextResponse.json(
        { success: false, error: 'Invalid department selected' },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: body.full_name.trim(),
        role: 'department',  // FIXED: Changed from 'staff' to 'department'
        department_name: body.department_name.trim()
      }
    });

    if (authError) throw authError;

    // Create profile record with scope fields
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authData.user.id,
        full_name: body.full_name.trim(),
        email: body.email.trim(),
        role: 'department',  // FIXED: Changed from 'staff' to 'department'
        department_name: body.department_name.trim(),
        assigned_department_ids: [department.id],  // CRITICAL: Map to department UUID
        school_ids: body.school_ids && body.school_ids.length > 0 ? body.school_ids : null,
        course_ids: body.course_ids && body.course_ids.length > 0 ? body.course_ids : null,
        branch_ids: body.branch_ids && body.branch_ids.length > 0 ? body.branch_ids : null
      }])
      .select()
      .single();

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        department_name: profile.department_name,
        role: profile.role,
        created_at: profile.created_at
      }
    }, { status: 201 });
  } catch (error) {
    console.error('POST staff error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create staff account' },
      { status: 500 }
    );
  }
}

// PUT - Update department staff account
export async function PUT(request) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (adminCheck.error) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    const updates = {};
    if (body.full_name !== undefined) updates.full_name = body.full_name.trim();
    if (body.department_name !== undefined) {
      // Verify department exists and get its ID
      const { data: department, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('id, name')
        .eq('name', body.department_name.trim())
        .single();

      if (deptError || !department) {
        return NextResponse.json(
          { success: false, error: 'Invalid department selected' },
          { status: 400 }
        );
      }
      updates.department_name = body.department_name.trim();
      updates.assigned_department_ids = [department.id];  // CRITICAL: Sync department UUID
    }

    // Update scope fields (allow empty arrays to be set as null)
    if (body.school_ids !== undefined) {
      updates.school_ids = body.school_ids && body.school_ids.length > 0 ? body.school_ids : null;
    }
    if (body.course_ids !== undefined) {
      updates.course_ids = body.course_ids && body.course_ids.length > 0 ? body.course_ids : null;
    }
    if (body.branch_ids !== undefined) {
      updates.branch_ids = body.branch_ids && body.branch_ids.length > 0 ? body.branch_ids : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update profile
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', body.id)
      .eq('role', 'department') // FIXED: Changed from 'staff' to 'department'
      .select()
      .single();

    if (error) throw error;

    // Update user metadata if full_name changed
    if (updates.full_name) {
      await supabaseAdmin.auth.admin.updateUserById(body.id, {
        user_metadata: { full_name: updates.full_name }
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PUT staff error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update staff account' },
      { status: 500 }
    );
  }
}

// DELETE - Delete department staff account
export async function DELETE(request) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (adminCheck.error) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('id');

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    // Verify it's a department staff member
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', staffId)
      .single();

    if (!profile || profile.role !== 'department') {  // FIXED: Changed from 'staff' to 'department'
      return NextResponse.json(
        { success: false, error: 'Staff member not found or not a department user' },
        { status: 404 }
      );
    }

    // Delete from auth (this will cascade to profile via RLS/triggers)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(staffId);
    if (authError) throw authError;

    // Also explicitly delete profile (in case cascade doesn't work)
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', staffId);

    return NextResponse.json({
      success: true,
      message: 'Staff account deleted successfully'
    });
  } catch (error) {
    console.error('DELETE staff error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete staff account' },
      { status: 500 }
    );
  }
}