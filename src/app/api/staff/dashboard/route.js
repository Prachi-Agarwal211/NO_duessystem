export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const searchQuery = searchParams.get('search');
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
      .select('role, department_name, school_id, school_ids, course_ids, branch_ids')
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
      // Department staff gets applications pending for their department
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
        .eq('department_name', profile.department_name)
        .eq('status', 'pending');

      // Apply scope filtering based on staff's access configuration
      // Filter by school_ids (if configured)
      if (profile.school_ids && profile.school_ids.length > 0) {
        query = query.in('no_dues_forms.school_id', profile.school_ids);
      } else if (profile.department_name === 'school_hod' && profile.school_id) {
        // Backward compatibility: old school_id field
        query = query.eq('no_dues_forms.school_id', profile.school_id);
      }

      // Filter by course_ids (if configured)
      if (profile.course_ids && profile.course_ids.length > 0) {
        query = query.in('no_dues_forms.course_id', profile.course_ids);
      }

      // Filter by branch_ids (if configured)
      if (profile.branch_ids && profile.branch_ids.length > 0) {
        query = query.in('no_dues_forms.branch_id', profile.branch_ids);
      }

      // Apply search filter if provided
      // Note: Search on related table requires filtering after fetch in this case
      // or we need to restructure the query

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
      const { count: totalCount, error: countError } = await supabaseAdmin
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