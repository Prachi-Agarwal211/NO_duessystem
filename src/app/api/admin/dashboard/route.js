import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const searchQuery = searchParams.get('search');
    const sortField = searchParams.get('sortField') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    if (status) {
      query = query.eq('status', status);
    }

    // Apply search filter
    if (searchQuery) {
      query = query.or(
        `student_name.ilike.%${searchQuery}%,registration_no.ilike.%${searchQuery}%,course.ilike.%${searchQuery}%`
      );
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });

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

    // Calculate response times using helper function
    const applicationsWithMetrics = applications.map(app => {
      const statusWithMetrics = app.no_dues_status.map(status => ({
        ...status,
        response_time: calculateResponseTime(app.created_at, status.created_at, status.action_at)
      }));

      const totalResponseTime = calculateTotalResponseTime(statusWithMetrics);

      return {
        ...app,
        no_dues_status: statusWithMetrics,
        total_response_time: totalResponseTime,
        pending_departments: statusWithMetrics.filter(s => s.status === 'pending').length,
        completed_departments: statusWithMetrics.filter(s => s.status === 'approved').length
      };
    });

    // Get summary statistics
    const { data: summaryStats, error: summaryError } = await supabaseAdmin
      .rpc('get_admin_summary_stats');

    if (summaryError) {
      console.error('Error fetching summary stats:', summaryError);
      // Don't fail the request if summary stats fail
    }

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

// Helper function for response time calculation
function calculateResponseTime(created_at, updated_at, action_at) {
  if (!action_at) return 'Pending';

  const created = new Date(created_at);
  const action = new Date(action_at);
  const diff = action - created;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function calculateTotalResponseTime(statuses) {
  const completed = statuses.filter(s => s.status === 'approved' && s.action_at);
  if (completed.length === 0) return 'N/A';

  const totalTime = completed.reduce((sum, status) => {
    if (status.action_at) {
      const created = new Date(status.created_at);
      const action = new Date(status.action_at);
      return sum + (action - created);
    }
    return sum;
  }, 0);

  const avgTime = totalTime / completed.length;
  const hours = Math.floor(avgTime / (1000 * 60 * 60));
  const minutes = Math.floor((avgTime % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}