import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const searchQuery = searchParams.get('search');
    const offset = (page - 1) * limit;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get session and verify user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role and department
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, department_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify user has department or admin role (Phase 1: only 2 roles)
    if (profile.role !== 'department' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let dashboardData = {};

    if (profile.role === 'admin') {
      // Admin gets all applications across all departments
      const { data: allApplications, error: allError } = await supabase
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
      const { count: totalCount, error: countError } = await supabase
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
      // Department staff gets applications pending for their department
      let query = supabase
        .from('no_dues_status')
        .select(`
          id,
          form_id,
          department_name,
          status,
          rejection_reason,
          action_at,
          action_by_user_id,
          no_dues_forms (
            id,
            student_name,
            registration_no,
            course,
            branch,
            contact_no,
            created_at,
            updated_at,
            status
          )
        `)
        .eq('department_name', profile.department_name)
        .eq('status', 'pending');

      // Apply search filter if provided
      // Note: Search on related table requires filtering after fetch in this case
      // or we need to restructure the query
      
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: pendingApplications, error: pendingError } = await query;

      if (pendingError) {
        return NextResponse.json({ error: pendingError.message }, { status: 500 });
      }

      // Filter by search term if provided (client-side filtering for related table)
      let filteredApplications = pendingApplications || [];
      if (searchQuery && filteredApplications.length > 0) {
        const searchLower = searchQuery.toLowerCase();
        filteredApplications = filteredApplications.filter(app => {
          const form = app.no_dues_forms;
          if (!form) return false;
          return (
            form.student_name?.toLowerCase().includes(searchLower) ||
            form.registration_no?.toLowerCase().includes(searchLower)
          );
        });
      }

      // Get total count for pagination
      const { count: totalCount, error: countError } = await supabase
        .from('no_dues_status')
        .select('*', { count: 'exact', head: true })
        .eq('department_name', profile.department_name)
        .eq('status', 'pending');

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
      }

      dashboardData = {
        role: 'department',
        department: profile.department_name,
        applications: filteredApplications,
        pagination: {
          page,
          limit,
          total: searchQuery ? filteredApplications.length : (totalCount || 0),
          totalPages: Math.ceil((searchQuery ? filteredApplications.length : (totalCount || 0)) / limit)
        }
      };
    }

    return NextResponse.json({ 
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Staff Dashboard API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}