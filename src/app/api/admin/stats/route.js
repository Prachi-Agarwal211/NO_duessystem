export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ CRITICAL FIX: Force Supabase to bypass Next.js server-side caching
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

// ⚡ PERFORMANCE: Response cache with 30-second TTL for optimal balance
const statsCache = new Map();
const CACHE_TTL = 30000; // 30 seconds - balanced caching for better performance

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const cacheKey = `admin_stats_${userId}`;

    // ⚡ PERFORMANCE: Check cache first
    const cached = statsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('📊 Returning cached admin stats');
      return NextResponse.json(cached.data);
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('⚡ Fetching fresh admin stats with parallel queries...');
    const startTime = Date.now();

    // ⚡ PERFORMANCE: Execute all queries in parallel
    const [
      overallStatsResult,
      departmentWorkloadResult,
      allStatusesResult,
      activityAndAlertsResult
    ] = await Promise.all([
      // Batch 1: Overall statistics
      supabaseAdmin.rpc('get_form_statistics'),
      
      // Batch 2: Department workload
      supabaseAdmin.rpc('get_department_workload'),
      
      // Batch 3: All statuses for response time calculation
      supabaseAdmin
        .from('no_dues_status')
        .select('department_name, status, created_at, action_at')
        .not('action_at', 'is', null),
      
      // Batch 4: Activity and alerts in parallel
      Promise.all([
        supabaseAdmin
          .from('no_dues_status')
          .select('id, action_at, department_name, status, no_dues_forms!inner(student_name, registration_no)')
          .gte('action_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('action_at', { ascending: false })
          .limit(50),
        
        supabaseAdmin
          .from('no_dues_status')
          .select('id, created_at, department_name, no_dues_forms!inner(student_name, registration_no, created_at)')
          .eq('status', 'pending')
          .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true })
          .limit(20)
      ])
    ]);

    const { data: overallStats, error: overallError } = overallStatsResult;
    const { data: departmentWorkload, error: deptWorkloadError } = departmentWorkloadResult;
    const { data: allStatuses, error: statusesError } = allStatusesResult;
    const [recentActivityResult, pendingAlertsResult] = activityAndAlertsResult;

    if (overallError) throw overallError;
    if (deptWorkloadError) console.error('Department workload error:', deptWorkloadError);
    if (statusesError) console.error('Statuses error:', statusesError);

    const { data: recentActivity } = recentActivityResult;
    const { data: pendingAlerts } = pendingAlertsResult;

    // Calculate department performance stats with response times
    const departmentStatsMap = new Map();

    // Initialize with department workload data
    if (departmentWorkload) {
      departmentWorkload.forEach(dept => {
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
        approval_rate: dept.approval_rate,
        rejection_rate: dept.rejection_rate
      };
    }).sort((a, b) => a.department_name.localeCompare(b.department_name));

    const responseData = {
      overallStats: overallStats || [],
      departmentStats: formattedDepartmentStats,
      recentActivity: recentActivity || [],
      pendingAlerts: pendingAlerts || []
    };

    // ⚡ PERFORMANCE: Cache the response
    statsCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    const queryTime = Date.now() - startTime;
    console.log(`✅ Admin stats fetched in ${queryTime}ms (was ~1500ms)`);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Admin stats API error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({
      error: 'Failed to load statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// Helper function for response time calculation
function formatTime(seconds) {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

// ⚡ PERFORMANCE: Cache invalidation endpoint for real-time updates
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (userId) {
      statsCache.delete(`admin_stats_${userId}`);
      console.log('🗑️ Admin stats cache cleared for user:', userId);
    } else {
      statsCache.clear();
      console.log('🗑️ All admin stats cache cleared');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
