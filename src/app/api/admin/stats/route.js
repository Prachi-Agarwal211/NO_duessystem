export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0; // Disable all caching

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calculateDepartmentStats } from '@/lib/statsHelpers';

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

    // ✅ FIX Issue #5: Add date filter for better performance
    // Only fetch last 30 days of data for response time calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all department statuses with timestamps for response time calculation
    const { data: allStatuses, error: statusesError } = await supabaseAdmin
      .from('no_dues_status')
      .select('department_name, status, created_at, action_at')
      .not('action_at', 'is', null)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (statusesError) {
      console.error('Statuses error:', statusesError);
    }

    // Calculate department performance stats using shared helper
    const formattedDepartmentStats = calculateDepartmentStats(departmentWorkload, allStatuses);

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
          created_at
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