export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0; // Disable all caching

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateAndVerify } from '@/lib/authHelpers';
import { addApplicationMetrics } from '@/lib/statsHelpers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const searchQuery = searchParams.get('search');
    const sortField = searchParams.get('sortField') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Authenticate and verify admin role
    const auth = await authenticateAndVerify(request, 'admin');
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Build query with filters
    let query = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status (
          id,
          department_name,
          status,
          action_at,
          created_at,
          rejection_reason,
          profiles!no_dues_status_action_by_user_id_fkey (
            full_name
          )
        )
      `)
      .order(sortField, { ascending: sortOrder === 'asc' });

    // Apply status filter
    let skipGlobalStatusFilter = false;

    // Apply department filter - filter by department status
    if (department) {
      // Get forms that have this department in their status
      let deptQuery = supabaseAdmin
        .from('no_dues_status')
        .select('form_id')
        .eq('department_name', department);
      
      // If status is also provided, filter by that department's status
      if (status) {
        deptQuery = deptQuery.eq('status', status);
        skipGlobalStatusFilter = true; // We are filtering by specific dept status, so skip global status filter
      }

      const { data: formsWithDept } = await deptQuery;
      
      if (formsWithDept && formsWithDept.length > 0) {
        const formIds = formsWithDept.map(f => f.form_id);
        query = query.in('id', formIds);
      } else {
        // No forms found for this department (and status if provided), return empty
        query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent UUID
      }
    }

    if (status && !skipGlobalStatusFilter) {
      query = query.eq('status', status);
    }

    // Apply search filter
    if (searchQuery) {
      query = query.or(
        `student_name.ilike.%${searchQuery}%,registration_no.ilike.%${searchQuery}%,course.ilike.%${searchQuery}%`
      );
    }

    // Get total count for pagination - 
    let countQuery = supabaseAdmin
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });

    // Apply same filters to count query
    let skipGlobalStatusCount = false;

    if (department) {
      let deptCountQuery = supabaseAdmin
        .from('no_dues_status')
        .select('form_id')
        .eq('department_name', department);
      
      if (status) {
        deptCountQuery = deptCountQuery.eq('status', status);
        skipGlobalStatusCount = true;
      }

      const { data: formsWithDeptCount } = await deptCountQuery;
      
      if (formsWithDeptCount && formsWithDeptCount.length > 0) {
        const formIdsCount = formsWithDeptCount.map(f => f.form_id);
        countQuery = countQuery.in('id', formIdsCount);
      } else {
        countQuery = countQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (status && !skipGlobalStatusCount) {
      countQuery = countQuery.eq('status', status);
    }
    if (searchQuery) {
      countQuery = countQuery.or(
        `student_name.ilike.%${searchQuery}%,registration_no.ilike.%${searchQuery}%,course.ilike.%${searchQuery}%`
      );
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: applications, error: applicationsError } = await query;

    if (applicationsError) {
      throw applicationsError;
    }

    // Calculate response times using shared helper
    const applicationsWithMetrics = applications.map(addApplicationMetrics);

    // Get summary statistics
    const { data: summaryStats, error: summaryError } = await supabaseAdmin
      .rpc('get_form_statistics');

    if (summaryError) {
      console.error('Error fetching summary stats:', summaryError);
      // Don't fail the request if summary stats fail
    }

    // 🔍 DEBUG: Log what we're returning to frontend
    console.log(`📊 Admin API returning ${applicationsWithMetrics.length} applications`);
    if (applicationsWithMetrics.length > 0) {
      const first = applicationsWithMetrics[0];
      const approved = first.no_dues_status?.filter(s => s.status === 'approved').length || 0;
      const pending = first.no_dues_status?.filter(s => s.status === 'pending').length || 0;
      const rejected = first.no_dues_status?.filter(s => s.status === 'rejected').length || 0;
      console.log(`📋 First app ${first.registration_no}: ${approved} approved, ${pending} pending, ${rejected} rejected`);
    }
    console.log(`📈 Stats: ${JSON.stringify(summaryStats)}`);

    return NextResponse.json({
      applications: applicationsWithMetrics,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      summaryStats: summaryStats || null
    });

  } catch (error) {
    console.error('Admin dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}