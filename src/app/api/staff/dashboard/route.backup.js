export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ OPTIMIZED: Admin client with no-cache enforcement
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  }
);

export async function GET(request) {
  try {
    // 1. Secure Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'No Auth Token' }, { status: 401 });
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Get Profile & Assigned Departments
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, assigned_department_ids, school_ids, course_ids, branch_ids')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 3. Resolve Department Names
    const { data: departments } = await supabaseAdmin
      .from('departments')
      .select('name, display_name')
      .in('id', profile.assigned_department_ids || []);
    
    const myDeptNames = departments?.map(d => d.name) || [];
    const isHOD = myDeptNames.includes('school_hod');

    // Admin Override (See everything - handled elsewhere)
    if (profile.role === 'admin' && myDeptNames.length === 0) {
      return NextResponse.json({
        success: true,
        data: { stats: { pending: 0, approved: 0, rejected: 0, total: 0 }, applications: [] }
      });
    }

    // 4. Empty Department Check
    if (myDeptNames.length === 0) {
      return NextResponse.json({
        success: true,
        data: { stats: { pending: 0, approved: 0, rejected: 0, total: 0 }, applications: [] }
      });
    }

    // 5. Parallel Fetching (Stats + Applications)
    const [statsResult, applicationsResult] = await Promise.all([
      // Query A: Status Counts (Lightweight - only status column)
      supabaseAdmin
        .from('no_dues_status')
        .select('status')
        .in('department_name', myDeptNames),
        
      // Query B: Applications (Specific Columns Only - No Images/Blobs)
      (async () => {
        let query = supabaseAdmin
          .from('no_dues_status')
          .select(`
            id,
            status,
            updated_at,
            department_name,
            no_dues_forms!inner (
              id, registration_no, student_name, course, branch, contact_no, status, school_id, course_id, branch_id
            )
          `)
          .in('department_name', myDeptNames)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(50); // Pagination Limit for Speed

        // HOD Scoping
        if (isHOD) {
          if (profile.school_ids?.length) query = query.in('no_dues_forms.school_id', profile.school_ids);
          if (profile.course_ids?.length) query = query.in('no_dues_forms.course_id', profile.course_ids);
          if (profile.branch_ids?.length) query = query.in('no_dues_forms.branch_id', profile.branch_ids);
        }

        return query;
      })()
    ]);

    // 6. Process Stats in Memory (Fast)
    const statsData = statsResult.data || [];
    const stats = {
      pending: statsData.filter(s => s.status === 'pending').length,
      approved: statsData.filter(s => s.status === 'approved').length,
      rejected: statsData.filter(s => s.status === 'rejected').length,
      total: statsData.length
    };

    return NextResponse.json({
      success: true,
      data: {
        stats,
        applications: applicationsResult.data || [],
        departments: departments?.map(d => ({ name: d.name, displayName: d.display_name })) || []
      }
    });

  } catch (error) {
    console.error('Staff Dashboard Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: { stats: { pending: 0, approved: 0, rejected: 0, total: 0 }, applications: [] }
    }, { status: 500 });
  }
}