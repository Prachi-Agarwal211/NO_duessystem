import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user profile to verify role and department
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, department_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile || (profile.role !== 'department' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let stats = {};

    if (profile.role === 'admin') {
      // Admin gets stats for all departments
      const { count: totalForms, error: totalError } = await supabase
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true });

      const { count: completedForms, error: completedError } = await supabase
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: pendingForms, error: pendingError } = await supabase
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (totalError || completedError || pendingError) {
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
      }

      stats = {
        totalApplications: totalForms || 0,
        completedApplications: completedForms || 0,
        pendingApplications: pendingForms || 0,
        departmentStats: []
      };

      // Get department-specific stats
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('name, display_name');

      if (!deptError && departments) {
        const deptStats = [];
        for (const dept of departments) {
          const { count: pendingCount, error: pendingCountError } = await supabase
            .from('no_dues_status')
            .select('*', { count: 'exact', head: true })
            .eq('department_name', dept.name)
            .eq('status', 'pending');

          const { count: approvedCount, error: approvedCountError } = await supabase
            .from('no_dues_status')
            .select('*', { count: 'exact', head: true })
            .eq('department_name', dept.name)
            .eq('status', 'approved');

          deptStats.push({
            department: dept.display_name,
            pending: pendingCount || 0,
            approved: approvedCount || 0
          });
        }
        stats.departmentStats = deptStats;
      }
    } else if (profile.role === 'department') {
      // Department staff gets stats for their department only
      const { count: pendingCount, error: pendingError } = await supabase
        .from('no_dues_status')
        .select('*', { count: 'exact', head: true })
        .eq('department_name', profile.department_name)
        .eq('status', 'pending');

      const { count: approvedCount, error: approvedError } = await supabase
        .from('no_dues_status')
        .select('*', { count: 'exact', head: true })
        .eq('department_name', profile.department_name)
        .eq('status', 'approved');

      const { count: rejectedCount, error: rejectedError } = await supabase
        .from('no_dues_status')
        .select('*', { count: 'exact', head: true })
        .eq('department_name', profile.department_name)
        .eq('status', 'rejected');

      if (pendingError || approvedError || rejectedError) {
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
      }

      stats = {
        department: profile.department_name,
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0
      };
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching staff stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}