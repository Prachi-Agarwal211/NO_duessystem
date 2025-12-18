export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    // 1. Get Profile with Scopes
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role, assigned_department_ids, school_ids')
        .eq('id', user.id)
        .single();

    console.log('📊 Dashboard Debug - User ID:', user.id);
    console.log('📊 Dashboard Debug - Profile:', profile);
    console.log('📊 Dashboard Debug - Profile Error:', profileError);

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 2. Resolve Department Names and Display Names
    const { data: depts, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('name, display_name')
        .in('id', profile.assigned_department_ids || []);
    
    console.log('📊 Dashboard Debug - Assigned Dept IDs:', profile.assigned_department_ids);
    console.log('📊 Dashboard Debug - Resolved Depts:', depts);
    console.log('📊 Dashboard Debug - Dept Error:', deptError);

    const myDeptNames = depts?.map(d => d.name) || [];
    const deptInfo = depts?.map(d => ({ name: d.name, displayName: d.display_name })) || [];

    console.log('📊 Dashboard Debug - My Dept Names:', myDeptNames);

    if (myDeptNames.length === 0 && profile.role !== 'admin') {
        console.log('⚠️ Dashboard Debug - No departments found, returning empty');
        return NextResponse.json({
            success: true,
            data: { stats: { pending: 0, approved: 0, rejected: 0, total: 0 }, applications: [] }
        });
    }

    // 3. BASE QUERY - Get all pending applications for this staff member
    let query = supabaseAdmin
        .from('no_dues_status')
        .select(`
            *,
            no_dues_forms!inner (
                id, registration_no, student_name, course, branch, created_at, status, school_id
            )
        `)
        .in('department_name', myDeptNames)
        .eq('status', 'pending');

    console.log('📊 Dashboard Debug - Query filtering by dept_names:', myDeptNames);

    // 4. HOD SCOPE ENFORCEMENT (Critical for School-level filtering)
    // If the staff is an HOD (school_hod), they must ONLY see students from their assigned school
    if (myDeptNames.includes('school_hod') && profile.school_ids && profile.school_ids.length > 0) {
        console.log('📊 Dashboard Debug - Applying HOD scope filter for schools:', profile.school_ids);
        query = query.in('no_dues_forms.school_id', profile.school_ids);
    }

    const { data: applications, error: queryError } = await query;

    console.log('📊 Dashboard Debug - Applications Query Error:', queryError);
    console.log('📊 Dashboard Debug - Applications Found:', applications?.length || 0);
    if (applications && applications.length > 0) {
        console.log('📊 Dashboard Debug - First Application:', applications[0]);
    }

    // 5. STATS CALCULATION - Pending (dept-wide) + Personal (approved/rejected by ME)
    const { count: pendingCount } = await supabaseAdmin
        .from('no_dues_status')
        .select('id', { count: 'exact', head: true })
        .in('department_name', myDeptNames)
        .eq('status', 'pending');

    // ✅ FIXED: Count only MY approvals/rejections
    const { count: approvedCount } = await supabaseAdmin
        .from('no_dues_status')
        .select('id', { count: 'exact', head: true })
        .in('department_name', myDeptNames)
        .eq('status', 'approved')
        .eq('action_by_user_id', user.id); // Only actions by ME

    const { count: rejectedCount } = await supabaseAdmin
        .from('no_dues_status')
        .select('id', { count: 'exact', head: true })
        .in('department_name', myDeptNames)
        .eq('status', 'rejected')
        .eq('action_by_user_id', user.id); // Only actions by ME

    return NextResponse.json({
        success: true,
        data: {
            stats: {
                pending: pendingCount || 0,
                approved: approvedCount || 0,
                rejected: rejectedCount || 0,
                total: (approvedCount || 0) + (rejectedCount || 0) // Total = MY actions only
            },
            applications: applications || [],
            departments: deptInfo // Include department display names
        }
    });

  } catch (error) {
    console.error('Staff Dashboard API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}