export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        });
      },
    },
  }
);

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending'; // pending, rejected, or all
    const course = searchParams.get('course');
    const branch = searchParams.get('branch');
    const search = searchParams.get('search');

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, assigned_department_ids, school_ids, course_ids, branch_ids')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Get department names
    let departments = null;
    if (profile.assigned_department_ids?.length > 0) {
      const { data: deptData } = await supabaseAdmin
        .from('departments')
        .select('name')
        .in('id', profile.assigned_department_ids);
      departments = deptData;
    }

    const myDeptNames = departments?.map(d => d.name) || [];

    if (myDeptNames.length === 0 && profile.role !== 'admin') {
      return NextResponse.json({ success: true, data: [] });
    }

    // Build query for ALL matching records (no pagination)
    let query = supabaseAdmin
      .from('no_dues_status')
      .select(`
        id,
        department_name,
        status,
        action_at,
        rejection_reason,
        no_dues_forms!inner (
          id,
          registration_no,
          student_name,
          course,
          branch,
          created_at,
          status,
          school_id,
          course_id,
          branch_id
        )
      `)
      .in('department_name', myDeptNames);

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply scope filtering
    if (profile.school_ids && profile.school_ids.length > 0) {
      query = query.in('no_dues_forms.school_id', profile.school_ids);
    }
    if (profile.course_ids && profile.course_ids.length > 0) {
      query = query.in('no_dues_forms.course_id', profile.course_ids);
    }
    if (profile.branch_ids && profile.branch_ids.length > 0) {
      query = query.in('no_dues_forms.branch_id', profile.branch_ids);
    }

    // Execute query
    const { data: applications, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Apply client-side filters (course, branch, search)
    let filteredData = applications || [];

    if (course && course !== 'All') {
      filteredData = filteredData.filter(item => item.no_dues_forms?.course === course);
    }

    if (branch && branch !== 'All') {
      filteredData = filteredData.filter(item => item.no_dues_forms?.branch === branch);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(item => {
        const form = item.no_dues_forms;
        return (
          form?.student_name?.toLowerCase().includes(searchLower) ||
          form?.registration_no?.toLowerCase().includes(searchLower)
        );
      });
    }

    return NextResponse.json({
      success: true,
      data: filteredData,
      count: filteredData.length
    });

  } catch (error) {
    console.error('Staff Export API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}