import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// This is the server-side admin client for bypassing RLS
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get overall statistics
    const { data: overallStats, error: overallError } = await supabaseAdmin
      .rpc('get_overall_stats');

    if (overallError) {
      throw overallError;
    }

    // Get department performance stats
    const { data: departmentStats, error: deptError } = await supabaseAdmin
      .from('no_dues_status')
      .select(`
        department_name,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        AVG(EXTRACT(EPOCH FROM (action_at - created_at))) as avg_response_time_seconds
      `)
      .not('action_at', 'is', null)
      .group('department_name')
      .order('department_name');

    if (deptError) {
      throw deptError;
    }

    // Format department stats
    const formattedDepartmentStats = departmentStats.map(dept => ({
      ...dept,
      avg_response_time: formatTime(dept.avg_response_time_seconds),
      approval_rate: (dept.approved_requests / dept.total_requests * 100).toFixed(2) + '%',
      rejection_rate: (dept.rejected_requests / dept.total_requests * 100).toFixed(2) + '%'
    }));

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