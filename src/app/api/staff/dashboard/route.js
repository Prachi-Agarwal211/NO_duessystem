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
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const searchQuery = searchParams.get('search');
    const includeStats = searchParams.get('includeStats') === 'true';
    const offset = (page - 1) * limit;

    // Get authenticated user from header/cookie via Supabase
    // Note: Since this is an API route, we need to verify the user's session
    // Ideally we should use createRouteHandlerClient but for now we'll use the token
    
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
      // Fallback for server-side calls or where auth might be handled differently
      // BUT we strictly validate this is not empty
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user profile to check role, department, and access scope
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, assigned_department_ids, department_name, school_id, school_ids, course_ids, branch_ids')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify user has department staff or admin role
    if (profile.role !== 'department' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let dashboardData = {};

    if (profile.role === 'admin') {
      // Admin gets all applications across all departments
      const { data: allApplications, error: allError } = await supabaseAdmin
        .from('no_dues_forms')
        .select(`
          id,
          student_name,
          registration_no,
          course,
          branch,
          contact_no,
          status,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (allError) {
        return NextResponse.json({ error: allError.message }, { status: 500 });
      }

      // Get total count for pagination
      const { count: totalCount, error: countError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
      }

      // Transform for dashboard display
      const applicationsWithForms = allApplications.map(app => ({
        no_dues_forms: app
      }));

      dashboardData = {
        role: 'admin',
        applications: applicationsWithForms || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        }
      };
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

      console.log('📊 Dashboard - User departments:', {
        userId,
        assignedDepartments: myDeptNames,
        isHOD
      });

      // Department staff gets applications pending for their assigned departments
      let query = supabaseAdmin
        .from('no_dues_status')
        .select(`
          id,
          form_id,
          department_name,
          status,
          rejection_reason,
          action_at,
          action_by_user_id,
          no_dues_forms!inner (
            id,
            student_name,
            registration_no,
            school,
            course,
            branch,
            contact_no,
            created_at,
            updated_at,
            status,
            school_id,
            course_id,
            branch_id
          )
        `)
        .in('department_name', myDeptNames)
        .eq('status', 'pending');

      // IMPORTANT: Apply scope filtering ONLY for school_hod (HOD/Dean)
      // The other departments see ALL students
      if (isHOD) {
        // CRITICAL FIX: Use UUID columns (school_id, course_id, branch_id) instead of TEXT columns
        // Apply school filtering for HOD staff using UUID arrays
        if (profile.school_ids && profile.school_ids.length > 0) {
          query = query.in('no_dues_forms.school_id', profile.school_ids);
        }
        
        // Apply course filtering for HOD staff using UUID arrays
        if (profile.course_ids && profile.course_ids.length > 0) {
          query = query.in('no_dues_forms.course_id', profile.course_ids);
        }
        
        // Apply branch filtering for HOD staff using UUID arrays
        if (profile.branch_ids && profile.branch_ids.length > 0) {
          query = query.in('no_dues_forms.branch_id', profile.branch_ids);
        }
      }
      // For other departments: No additional filtering - they see all students

      // ✅ CRITICAL FIX: Apply search BEFORE pagination using !inner
      // This searches inside the database query, not client-side
      if (searchQuery) {
        query = query.or(
          `student_name.ilike.%${searchQuery}%,registration_no.ilike.%${searchQuery}%`,
          { foreignTable: 'no_dues_forms' }
        );
      }

      // Apply pagination AFTER filtering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: pendingApplications, error: pendingError } = await query;

      if (pendingError) {
        console.error('❌ Error fetching pending applications:', pendingError);
        return NextResponse.json({ error: pendingError.message }, { status: 500 });
      }

      // DEBUG: Log what we got from database
      console.log('📊 Dashboard API - Pending applications:', pendingApplications?.length || 0);
      if (pendingApplications && pendingApplications.length > 0) {
        console.log('📋 First application:', {
          status_id: pendingApplications[0].id,
          form_id: pendingApplications[0].form_id,
          department: pendingApplications[0].department_name,
          has_form: !!pendingApplications[0].no_dues_forms,
          form_id_in_form: pendingApplications[0].no_dues_forms?.id
        });
      }

      // ✅ Search already applied at database level - no client-side filtering needed
      const filteredApplications = pendingApplications || [];

      // Get total count for pagination
      let countQuery = supabaseAdmin
        .from('no_dues_status')
        .select('no_dues_forms!inner(school_id, course_id, branch_id, student_name, registration_no)', { count: 'exact', head: true })
        .in('department_name', myDeptNames)
        .eq('status', 'pending');

      // Apply the SAME scope filtering for HOD staff as the main query
      if (isHOD) {
        // Apply school filtering for HOD staff using UUID arrays
        if (profile.school_ids && profile.school_ids.length > 0) {
          countQuery = countQuery.in('no_dues_forms.school_id', profile.school_ids);
        }
        
        // Apply course filtering for HOD staff using UUID arrays
        if (profile.course_ids && profile.course_ids.length > 0) {
          countQuery = countQuery.in('no_dues_forms.course_id', profile.course_ids);
        }
        
        // Apply branch filtering for HOD staff using UUID arrays
        if (profile.branch_ids && profile.branch_ids.length > 0) {
          countQuery = countQuery.in('no_dues_forms.branch_id', profile.branch_ids);
        }
      }

      // Apply search to count query as well
      if (searchQuery) {
        countQuery = countQuery.or(
          `student_name.ilike.%${searchQuery}%,registration_no.ilike.%${searchQuery}%`,
          { foreignTable: 'no_dues_forms' }
        );
      }

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
      }

      dashboardData = {
        role: 'staff',
        departments: myDepartments.map(d => ({
          name: d.name,
          displayName: d.display_name
        })),
        department: myDepartments[0]?.name, // Primary department for backward compatibility
        applications: filteredApplications,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        }
      };
    }

    // ⚡ PERFORMANCE: Include stats in same response if requested
    let stats = null;
    if (includeStats) {
      try {
        if (profile.role === 'department') {
          // ⚡ OPTIMIZED: Parallel queries for personal + pending stats
          const [personalResult, pendingResult, deptResult] = await Promise.all([
            // Personal actions by this user across all assigned departments
            supabaseAdmin
              .from('no_dues_status')
              .select('status, department_name, no_dues_forms!inner(school_id, course_id, branch_id)')
              .in('department_name', myDeptNames)
              .eq('action_by_user_id', userId),
            
            // Pending items for assigned departments
            (async () => {
              let pendingQuery = supabaseAdmin
                .from('no_dues_status')
                .select('status, no_dues_forms!inner(school_id, course_id, branch_id)')
                .in('department_name', myDeptNames)
                .eq('status', 'pending');
              
              // Apply the SAME scope filtering for HOD staff as the main query
              if (isHOD) {
                if (profile.school_ids && profile.school_ids.length > 0) {
                  pendingQuery = pendingQuery.in('no_dues_forms.school_id', profile.school_ids);
                }
                if (profile.course_ids && profile.course_ids.length > 0) {
                  pendingQuery = pendingQuery.in('no_dues_forms.course_id', profile.course_ids);
                }
                if (profile.branch_ids && profile.branch_ids.length > 0) {
                  pendingQuery = pendingQuery.in('no_dues_forms.branch_id', profile.branch_ids);
                }
              }
              
              return pendingQuery;
            })(),
            
            // Get first department info for display
            Promise.resolve({ data: myDepartments[0] })
          ]);

          const personalActions = personalResult.data || [];
          const pendingActions = pendingResult.data || [];
          const deptInfo = deptResult.data;

          const myApprovedCount = personalActions.filter(s => s.status === 'approved').length;
          const myRejectedCount = personalActions.filter(s => s.status === 'rejected').length;
          const myTotalCount = personalActions.length;
          const pendingCount = pendingActions.length;

          stats = {
            departments: myDepartments.map(d => d.display_name),
            department: deptInfo?.display_name || myDepartments[0]?.display_name,
            departmentName: myDepartments[0]?.name,
            pending: pendingCount,
            approved: myApprovedCount,
            rejected: myRejectedCount,
            total: myTotalCount,
            approvalRate: myTotalCount > 0 ? Math.round((myApprovedCount / myTotalCount) * 100) : 0
          };

          // Get today's activity across all assigned departments
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const { data: todayActions } = await supabaseAdmin
            .from('no_dues_status')
            .select('status')
            .in('department_name', myDeptNames)
            .eq('action_by_user_id', userId)
            .gte('action_at', today.toISOString());

          if (todayActions) {
            stats.todayApproved = todayActions.filter(a => a.status === 'approved').length;
            stats.todayRejected = todayActions.filter(a => a.status === 'rejected').length;
            stats.todayTotal = todayActions.length;
          }
        }
      } catch (statsError) {
        console.error('Error fetching stats:', statsError);
        // Don't fail the whole request if stats fail
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...dashboardData,
        ...(stats && { stats })
      }
    });
  } catch (error) {
    console.error('Staff Dashboard API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}