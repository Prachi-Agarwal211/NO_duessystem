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
          cache: 'no-store', // Bypass Next.js fetch cache
        });
      },
    },
  }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get authenticated user from Authorization header
    const authHeader = request.headers.get('Authorization');
    let userId;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    } else {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user profile to verify role and department
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, department_name, school_id, school_ids, course_ids, branch_ids')
      .eq('id', userId)
      .single();

    if (profileError || !profile || (profile.role !== 'department' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let stats = {};

    if (profile.role === 'admin') {
      // Admin gets comprehensive stats for all departments
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
              statsMap[record.department_name] = { pending: 0, approved: 0, rejected: 0 };
            }
            if (record.status === 'pending') {
              statsMap[record.department_name].pending++;
            } else if (record.status === 'approved') {
              statsMap[record.department_name].approved++;
            } else if (record.status === 'rejected') {
              statsMap[record.department_name].rejected++;
            }
          });

          // Map back to departments with display names
          stats.departmentStats = departments.map(dept => ({
            department: dept.display_name,
            departmentName: dept.name,
            pending: statsMap[dept.name]?.pending || 0,
            approved: statsMap[dept.name]?.approved || 0,
            rejected: statsMap[dept.name]?.rejected || 0,
            total: (statsMap[dept.name]?.pending || 0) + 
                   (statsMap[dept.name]?.approved || 0) + 
                   (statsMap[dept.name]?.rejected || 0)
          }));
        } else {
          stats.departmentStats = [];
        }
      }
    } else if (profile.role === 'department') {
      // Department staff members get comprehensive stats for their department AND personal actions
      
      // 1. Get PERSONAL action counts (actions taken by THIS staff member)
      // CRITICAL: Exclude manual entries (is_manual_entry = true) from stats
      let personalQuery = supabaseAdmin
        .from('no_dues_status')
        .select(`
          status,
          no_dues_forms!inner (
            school_id,
            course_id,
            branch_id,
            is_manual_entry
          )
        `)
        .eq('department_name', profile.department_name)
        .eq('action_by_user_id', userId)
        .eq('no_dues_forms.is_manual_entry', false); // Exclude manual entries

      // Apply scope filtering for personal actions
      if (profile.school_ids && profile.school_ids.length > 0) {
        personalQuery = personalQuery.in('no_dues_forms.school_id', profile.school_ids);
      } else if (profile.department_name === 'school_hod' && profile.school_id) {
        personalQuery = personalQuery.eq('no_dues_forms.school_id', profile.school_id);
      }

      if (profile.course_ids && profile.course_ids.length > 0) {
        personalQuery = personalQuery.in('no_dues_forms.course_id', profile.course_ids);
      }

      if (profile.branch_ids && profile.branch_ids.length > 0) {
        personalQuery = personalQuery.in('no_dues_forms.branch_id', profile.branch_ids);
      }

      const { data: personalActions, error: personalError } = await personalQuery;

      if (personalError) {
        console.error('Error fetching personal stats:', personalError);
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
      }

      // 2. Get PENDING counts (for the whole department scope - these need action)
      // CRITICAL: Exclude manual entries from pending count
      let pendingQuery = supabaseAdmin
        .from('no_dues_status')
        .select(`
          status,
          no_dues_forms!inner (
            school_id,
            course_id,
            branch_id,
            is_manual_entry
          )
        `)
        .eq('department_name', profile.department_name)
        .eq('status', 'pending')
        .eq('no_dues_forms.is_manual_entry', false); // Exclude manual entries

      // Apply scope filtering for pending
      if (profile.school_ids && profile.school_ids.length > 0) {
        pendingQuery = pendingQuery.in('no_dues_forms.school_id', profile.school_ids);
      } else if (profile.department_name === 'school_hod' && profile.school_id) {
        pendingQuery = pendingQuery.eq('no_dues_forms.school_id', profile.school_id);
      }

      if (profile.course_ids && profile.course_ids.length > 0) {
        pendingQuery = pendingQuery.in('no_dues_forms.course_id', profile.course_ids);
      }

      if (profile.branch_ids && profile.branch_ids.length > 0) {
        pendingQuery = pendingQuery.in('no_dues_forms.branch_id', profile.branch_ids);
      }

      const { data: pendingActions, error: pendingError } = await pendingQuery;

      if (pendingError) {
        console.error('Error fetching pending stats:', pendingError);
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
      }

      // Aggregate personal action counts
      const myApprovedCount = personalActions?.filter(s => s.status === 'approved').length || 0;
      const myRejectedCount = personalActions?.filter(s => s.status === 'rejected').length || 0;
      const myTotalCount = personalActions?.length || 0;
      const pendingCount = pendingActions?.length || 0;

      // Get department display name
      const { data: deptInfo, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('display_name')
        .eq('name', profile.department_name)
        .single();

      stats = {
        department: deptInfo?.display_name || profile.department_name,
        departmentName: profile.department_name,
        pending: pendingCount, // Department pending (need action)
        approved: myApprovedCount, // MY approved count
        rejected: myRejectedCount, // MY rejected count
        total: myTotalCount, // MY total actions
        approvalRate: myTotalCount > 0 ? Math.round((myApprovedCount / myTotalCount) * 100) : 0
      };

      // Get today's activity (MY actions today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayActions, error: todayError } = await supabaseAdmin
        .from('no_dues_status')
        .select('status')
        .eq('department_name', profile.department_name)
        .eq('action_by_user_id', userId) // Only MY actions
        .gte('action_at', today.toISOString());

      if (!todayError && todayActions) {
        stats.todayApproved = todayActions.filter(a => a.status === 'approved').length;
        stats.todayRejected = todayActions.filter(a => a.status === 'rejected').length;
        stats.todayTotal = todayActions.length;
      } else {
        stats.todayApproved = 0;
        stats.todayRejected = 0;
        stats.todayTotal = 0;
      }
    }

    return NextResponse.json({ 
      success: true,
      stats 
    });
  } catch (error) {
    console.error('Error fetching staff stats:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}