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

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get overall statistics using existing database function
    const { data: overallStats, error: overallError } = await supabaseAdmin
      .rpc('get_form_statistics');

    if (overallError) {
      throw overallError;
    }

    // Get department workload using existing database function
    const { data: departmentWorkload, error: deptWorkloadError } = await supabaseAdmin
      .rpc('get_department_workload');

    if (deptWorkloadError) {
      console.error('Department workload error:', deptWorkloadError);
    }

    // Get all department statuses with timestamps for response time calculation
    const { data: allStatuses, error: statusesError } = await supabaseAdmin
      .from('no_dues_status')
      .select('department_name, status, created_at, action_at')
      .not('action_at', 'is', null);

    if (statusesError) {
      console.error('Statuses error:', statusesError);
    }

    // Calculate department performance stats using JavaScript aggregation
    const departmentStatsMap = new Map();

    // Initialize with department workload data
    if (departmentWorkload) {
      departmentWorkload.forEach(dept => {
        departmentStatsMap.set(dept.department_name, {
          department_name: dept.department_name,
          total_requests: Number(dept.pending_count || 0) + Number(dept.approved_count || 0) + Number(dept.rejected_count || 0),
          approved_requests: Number(dept.approved_count || 0),
          rejected_requests: Number(dept.rejected_count || 0),
          pending_requests: Number(dept.pending_count || 0),
          response_times: []
        });
      });
    }

    // Calculate response times
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

    // Format department stats with calculated metrics
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
        approval_rate: dept.total_requests > 0
          ? ((dept.approved_requests / dept.total_requests) * 100).toFixed(2) + '%'
          : '0%',
        rejection_rate: dept.total_requests > 0
          ? ((dept.rejected_requests / dept.total_requests) * 100).toFixed(2) + '%'
          : '0%'
      };
    }).sort((a, b) => a.department_name.localeCompare(b.department_name));

    // Get recent activity (last 30 days)
    const { data: recentActivity, error: activityError } = await supabaseAdmin
      .from('no_dues_status')
      .select(`
        id,
        action_at,
        department_name,
        status,
        no_dues_forms!inner (
          student_name,
          registration_no
        )
      `)
      .gte('action_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('action_at', { ascending: false })
      .limit(50);

    if (activityError) {
      throw activityError;
    }

    // Get pending request alerts
    const { data: pendingAlerts, error: alertError } = await supabaseAdmin
      .from('no_dues_status')
      .select(`
        id,
        created_at,
        department_name,
        no_dues_forms!inner (
          student_name,
          registration_no,
          created_at as form_created_at
        )
      `)
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Pending for more than 7 days
      .order('created_at', { ascending: true })
      .limit(20);

    if (alertError) {
      console.error('Pending alerts error:', alertError);
    }

    return NextResponse.json({
      overallStats: overallStats || [],
      departmentStats: formattedDepartmentStats,
      recentActivity: recentActivity || [],
      pendingAlerts: pendingAlerts || []
    });

  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatTime(seconds) {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}