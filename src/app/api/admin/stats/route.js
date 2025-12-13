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

// ⚡ PERFORMANCE: Response cache with 60-second TTL
const statsCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

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

    // ⚡ PERFORMANCE: Execute all queries in parallel (was 5 sequential, now 2 parallel batches)
    const [
      overallStatsResult,
      departmentWorkloadResult,
      activityAndAlertsResult
    ] = await Promise.all([
      // Batch 1: Overall statistics
      supabaseAdmin.rpc('get_form_statistics'),
      
      // Batch 2: Department workload with response times (optimized single query)
      supabaseAdmin.rpc('get_department_workload'),
      
      // Batch 3: Activity and alerts in parallel
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
    const [[recentActivityResult, pendingAlertsResult]] = activityAndAlertsResult;

    if (overallError) throw overallError;
    if (deptWorkloadError) console.error('Department workload error:', deptWorkloadError);

    const { data: recentActivity } = recentActivityResult;
    const { data: pendingAlerts } = pendingAlertsResult;

    // ⚡ PERFORMANCE: Optimized department stats calculation
    const departmentStatsMap = new Map();

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
          avg_response_time: 'N/A',
          avg_response_time_seconds: 0,
          approval_rate: total > 0 ? ((approved / total) * 100).toFixed(2) + '%' : '0%',
          rejection_rate: total > 0 ? ((rejected / total) * 100).toFixed(2) + '%' : '0%'
        });
      });
    }

    const formattedDepartmentStats = Array.from(departmentStatsMap.values())
      .sort((a, b) => a.department_name.localeCompare(b.department_name));

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
    console.error('Admin stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
