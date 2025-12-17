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
      .select('role, assigned_department_ids, department_name, school_id, school_ids, course_ids, branch_ids')
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
      // ✅ NEW: Get department names from assigned UUIDs
      const { data: myDepartments, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('id, name, display_name')
        .in('id', profile.assigned_department_ids || []);

      if (deptError || !myDepartments || myDepartments.length === 0) {
        return NextResponse.json({
          error: 'No departments assigned to your account. Contact administrator.'
        }, { status: 403 });
      }

      const myDeptNames = myDepartments.map(d => d.name);
      const isHOD = myDeptNames.includes('school_hod');

      console.log('📊 Stats API - User departments:', {
        userId,
        assignedDepartments: myDeptNames,
        isHOD
      });

      // Department staff members get comprehensive stats for their assigned departments AND personal actions
      
      // 1. Get PERSONAL action counts (actions taken by THIS staff member)
      let personalQuery = supabaseAdmin
        .from('no_dues_status')
        .select(`
          status,
          no_dues_forms!inner (
            school_id,
            course_id,
            branch_id
          )
        `)
        .in('department_name', myDeptNames)
        .eq('action_by_user_id', userId);

      // IMPORTANT: Apply scope filtering ONLY for school_hod (HOD/Dean)
      // The other departments see ALL students (consistent with dashboard API)
      if (isHOD) {
        // Apply school filtering for HOD staff using UUID arrays
        if (profile.school_ids && profile.school_ids.length > 0) {
          personalQuery = personalQuery.in('no_dues_forms.school_id', profile.school_ids);
        }
        
        // Apply course filtering for HOD staff using UUID arrays
        if (profile.course_ids && profile.course_ids.length > 0) {
          personalQuery = personalQuery.in('no_dues_forms.course_id', profile.course_ids);
        }
        
        // Apply branch filtering for HOD staff using UUID arrays
        if (profile.branch_ids && profile.branch_ids.length > 0) {
          personalQuery = personalQuery.in('no_dues_forms.branch_id', profile.branch_ids);
        }
      }
      // For other 9 departments: No additional filtering - they see all students

      const { data: personalActions, error: personalError } = await personalQuery;

      if (personalError) {
        console.error('Error fetching personal stats:', personalError);
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
      }

      // 2. Get PENDING counts (for all assigned departments - these need action)
      console.log('📊 Stats API - Building pending query for:', {
        departments: myDeptNames,
        userId: userId,
        isHOD
      });

      let pendingQuery = supabaseAdmin
        .from('no_dues_status')
        .select(`
          status,
          no_dues_forms!inner (
            school_id,
            course_id,
            branch_id
          )
        `)
        .in('department_name', myDeptNames)
        .eq('status', 'pending');

      // IMPORTANT: Apply scope filtering ONLY for school_hod (HOD/Dean)
      // The other departments see ALL students (consistent with dashboard API)
      if (isHOD) {
        // Apply school filtering for HOD staff using UUID arrays
        if (profile.school_ids && profile.school_ids.length > 0) {
          pendingQuery = pendingQuery.in('no_dues_forms.school_id', profile.school_ids);
        }
        
        // Apply course filtering for HOD staff using UUID arrays
        if (profile.course_ids && profile.course_ids.length > 0) {
          pendingQuery = pendingQuery.in('no_dues_forms.course_id', profile.course_ids);
        }
        
        // Apply branch filtering for HOD staff using UUID arrays
        if (profile.branch_ids && profile.branch_ids.length > 0) {
          pendingQuery = pendingQuery.in('no_dues_forms.branch_id', profile.branch_ids);
        }
      }
      // For other 9 departments: No additional filtering - they see all students

      const { data: pendingActions, error: pendingError } = await pendingQuery;

      // DEBUG: Log what we got
      console.log('📊 Stats API - Pending query result:', {
        department: profile.department_name,
        count: pendingActions?.length || 0,
        sample: pendingActions?.[0] || null,
        error: pendingError
      });

      if (pendingError) {
        console.error('Error fetching pending stats:', pendingError);
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
      }

      // Aggregate personal action counts
      const myApprovedCount = personalActions?.filter(s => s.status === 'approved').length || 0;
      const myRejectedCount = personalActions?.filter(s => s.status === 'rejected').length || 0;
      const myTotalCount = personalActions?.length || 0;
      const pendingCount = pendingActions?.length || 0;

      stats = {
        departments: myDepartments.map(d => d.display_name),
        department: myDepartments[0]?.display_name || profile.department_name,
        departmentName: myDepartments[0]?.name || profile.department_name,
        pending: pendingCount, // Departments pending (need action)
        approved: myApprovedCount, // MY approved count
        rejected: myRejectedCount, // MY rejected count
        total: myTotalCount, // MY total actions
        approvalRate: myTotalCount > 0 ? Math.round((myApprovedCount / myTotalCount) * 100) : 0
      };

      // Get today's activity (MY actions today across all assigned departments)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayActions, error: todayError } = await supabaseAdmin
        .from('no_dues_status')
        .select('status')
        .in('department_name', myDeptNames)
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