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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 1. Verify admin authorization
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('⚡ Fetching admin stats via optimized RPC functions...');

    // 2. Fetch Global Stats via RPC (uses new optimized function)
    const { data: overall, error: overallError } = await supabaseAdmin.rpc('get_form_statistics');
    if (overallError) throw overallError;

    // 3. Fetch Department Breakdown via RPC (uses new optimized function)
    const { data: workload, error: workloadError } = await supabaseAdmin.rpc('get_department_workload');
    if (workloadError) throw workloadError;

    // 4. Fetch Recent Activity (only completed actions)
    const { data: recent } = await supabaseAdmin
      .from('no_dues_status')
      .select('id, department_name, status, action_at, no_dues_forms(student_name, registration_no)')
      .neq('status', 'pending') // Only show actions taken
      .order('action_at', { ascending: false })
      .limit(10);

    // 5. Fetch Pending Alerts (old pending applications)
    const { data: alerts } = await supabaseAdmin
      .from('no_dues_status')
      .select('id, created_at, department_name, no_dues_forms(student_name, registration_no, created_at)')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
      .limit(20);

    // 6. Calculate Response Times for Department Stats
    const { data: allStatuses } = await supabaseAdmin
      .from('no_dues_status')
      .select('department_name, status, created_at, action_at')
      .not('action_at', 'is', null);

    // 7. Enhance Department Stats with Response Times
    const departmentStatsMap = new Map();

    // Initialize from RPC data
    if (workload) {
      workload.forEach(dept => {
        const total = Number(dept.pending_count || 0) + Number(dept.approved_count || 0) + Number(dept.rejected_count || 0);
        const approved = Number(dept.approved_count || 0);
        const rejected = Number(dept.rejected_count || 0);

        departmentStatsMap.set(dept.department_name, {
          department_name: dept.department_name,
          total_requests: total,
          approved_requests: approved,
          rejected_requests: rejected,
          pending_requests: Number(dept.pending_count || 0),
          response_times: [],
          approval_rate: total > 0 ? ((approved / total) * 100).toFixed(2) + '%' : '0%',
          rejection_rate: total > 0 ? ((rejected / total) * 100).toFixed(2) + '%' : '0%'
        });
      });
    }

    // Add response time data
    if (allStatuses) {
      allStatuses.forEach(status => {
        if (status.action_at && status.created_at) {
          const responseTime = (new Date(status.action_at) - new Date(status.created_at)) / 1000;
          const deptStats = departmentStatsMap.get(status.department_name);
          if (deptStats) {
            deptStats.response_times.push(responseTime);
          }
        }
      });
    }

    // 8. Format Final Response
    const statsObj = overall?.[0] || {
      total_applications: 0,
      pending_applications: 0,
      approved_applications: 0,
      rejected_applications: 0
    };

    const formattedDepartmentStats = Array.from(departmentStatsMap.values()).map(dept => {
      const avgResponseTime = dept.response_times.length > 0
        ? dept.response_times.reduce((sum, time) => sum + time, 0) / dept.response_times.length
        : 0;

      return {
        department_name: dept.department_name,
        total_requests: dept.total_requests,
        approved_requests: dept.approved_requests,
        rejected_requests: dept.rejected_requests,
        pending_requests: dept.pending_requests,
        avg_response_time: formatTime(avgResponseTime),
        avg_response_time_seconds: avgResponseTime,
        approval_rate: dept.approval_rate,
        rejection_rate: dept.rejection_rate
      };
    }).sort((a, b) => a.department_name.localeCompare(b.department_name));

    return NextResponse.json({
      overallStats: {
        totalApplications: Number(statsObj.total_applications),
        pendingApplications: Number(statsObj.pending_applications),
        approvedApplications: Number(statsObj.approved_applications),
        rejectedApplications: Number(statsObj.rejected_applications)
      },
      departmentStats: formattedDepartmentStats,
      recentActivity: recent || [],
      pendingAlerts: alerts || []
    });

  } catch (error) {
    console.error('❌ Admin Stats API Error:', error);
    return NextResponse.json({
      error: error.message,
      overallStats: {
        totalApplications: 0,
        pendingApplications: 0,
        approvedApplications: 0,
        rejectedApplications: 0
      },
      departmentStats: [],
      recentActivity: [],
      pendingAlerts: []
    }, { status: 500 });
  }
}

// Helper function for response time formatting
function formatTime(seconds) {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}
