export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user profile to verify role and department
    const { data: profile, error: profileError } = await supabaseAdmin
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
      const { count: totalForms, error: totalError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true });

      const { count: completedForms, error: completedError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: pendingForms, error: pendingError } = await supabaseAdmin
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

      // Get department-specific stats - OPTIMIZED: Single query with aggregation
      const { data: departments, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('name, display_name')
        .order('display_order');

      if (!deptError && departments) {
        // Single aggregated query instead of N+1 queries
        const { data: statusCounts, error: statusError } = await supabaseAdmin
          .from('no_dues_status')
          .select('department_name, status');

        if (!statusError && statusCounts) {
          // Aggregate counts in memory (much faster than N queries)
          const statsMap = {};

          statusCounts.forEach(record => {
            if (!statsMap[record.department_name]) {
              statsMap[record.department_name] = { pending: 0, approved: 0 };
            }
            if (record.status === 'pending') {
              statsMap[record.department_name].pending++;
            } else if (record.status === 'approved') {
              statsMap[record.department_name].approved++;
            }
          });

          // Map back to departments with display names
          stats.departmentStats = departments.map(dept => ({
            department: dept.display_name,
            pending: statsMap[dept.name]?.pending || 0,
            approved: statsMap[dept.name]?.approved || 0
          }));
        } else {
          stats.departmentStats = [];
        }
      }
    } else if (profile.role === 'department') {
      // Department staff gets stats for their department only
      const { count: pendingCount, error: pendingError } = await supabaseAdmin
        .from('no_dues_status')
        .select('*', { count: 'exact', head: true })
        .eq('department_name', profile.department_name)
        .eq('status', 'pending');

      const { count: approvedCount, error: approvedError } = await supabaseAdmin
        .from('no_dues_status')
        .select('*', { count: 'exact', head: true })
        .eq('department_name', profile.department_name)
        .eq('status', 'approved');

      const { count: rejectedCount, error: rejectedError } = await supabaseAdmin
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