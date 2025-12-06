export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0; // Disable all caching

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateAndVerify } from '@/lib/authHelpers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const searchQuery = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Authenticate and verify role
    const auth = await authenticateAndVerify(request, ['department', 'admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { profile } = auth;

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
      // Department staff gets ALL applications for their department (not just pending)
      // This allows them to see their approved/rejected history
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
        .eq('department_name', profile.department_name);
        // ✅ REMOVED: .eq('status', 'pending') - now shows all statuses

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
      if (searchQuery) {
        query = query.or(
          `student_name.ilike.%${searchQuery}%,registration_no.ilike.%${searchQuery}%`,
          { foreignTable: 'no_dues_forms' }
        );
      }

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
      // REMOVED: Now handled in DB query
      let filteredApplications = pendingApplications || [];

      // Get total count for pagination
      let countQuery = supabaseAdmin
        .from('no_dues_status')
        .select('*, no_dues_forms!inner(*)', { count: 'exact', head: true })
        .eq('department_name', profile.department_name);

      // Apply scope filtering to count query as well
      if (profile.school_ids && profile.school_ids.length > 0) {
        countQuery = countQuery.in('no_dues_forms.school_id', profile.school_ids);
      } else if (profile.department_name === 'school_hod' && profile.school_id) {
        countQuery = countQuery.eq('no_dues_forms.school_id', profile.school_id);
      }
      if (profile.course_ids && profile.course_ids.length > 0) {
        countQuery = countQuery.in('no_dues_forms.course_id', profile.course_ids);
      }
      if (profile.branch_ids && profile.branch_ids.length > 0) {
        countQuery = countQuery.in('no_dues_forms.branch_id', profile.branch_ids);
      }

      // Apply search to count query
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
        role: 'department',
        department: profile.department_name,
        applications: filteredApplications,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
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