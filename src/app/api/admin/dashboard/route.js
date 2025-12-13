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

// ⚡ PERFORMANCE: Response cache with 30-second TTL
const dashboardCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

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
    
    // ⚡ PERFORMANCE: Generate cache key from request params
    const cacheKey = `dashboard_${page}_${limit}_${status || 'all'}_${department || 'all'}_${searchQuery || 'none'}_${sortField}_${sortOrder}`;
    
    // ⚡ PERFORMANCE: Check cache first
    const cached = dashboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('📦 Returning cached dashboard data');
      return NextResponse.json(cached.data);
    }

    // Get authenticated user from header/cookie via Supabase
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

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('⚡ Fetching fresh dashboard data...');
    const startTime = Date.now();

    // ⚡ PERFORMANCE: Optimized query - only select needed columns
    // ✅ CRITICAL: Exclude manual entries from regular applications list
    let query = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        student_name,
        registration_no,
        course,
        branch,
        school,
        contact_no,
        status,
        created_at,
        updated_at,
        reapplication_count,
        no_dues_status!inner (
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
      .eq('is_manual_entry', false)
      .order(sortField, { ascending: sortOrder === 'asc' });

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply department filter - filter by department status
    if (department) {
      // Get forms that have this department in their status
      const { data: formsWithDept } = await supabaseAdmin
        .from('no_dues_status')
        .select('form_id')
        .eq('department_name', department);
      
      if (formsWithDept && formsWithDept.length > 0) {
        const formIds = formsWithDept.map(f => f.form_id);
        query = query.in('id', formIds);
      } else {
        // No forms found for this department, return empty
        query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent UUID
      }
    }

    // Apply search filter
    if (searchQuery) {
      query = query.or(
        `student_name.ilike.%${searchQuery}%,registration_no.ilike.%${searchQuery}%,course.ilike.%${searchQuery}%`
      );
    }

    // ⚡ PERFORMANCE: Parallel queries for count and data
    // Apply pagination to query first
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Execute count and data queries in parallel
    // ✅ CRITICAL: Count only excludes manual entries
    const [applicationsResult, countResult] = await Promise.all([
      query,
      supabaseAdmin
        .from('no_dues_forms')
        .select('id', { count: 'exact', head: true })
        .eq('is_manual_entry', false) // ✅ Count only online submissions
    ]);

    const { data: applications, error: applicationsError } = applicationsResult;
    const { count: totalCount, error: countError } = countResult;

    if (applicationsError) {
      throw applicationsError;
    }

    if (countError) {
      console.error('Count error:', countError);
      // Don't fail request if count fails
    }

    // ⚡ PERFORMANCE: Optimized metrics calculation
    const applicationsWithMetrics = applications.map(app => {
      const statuses = app.no_dues_status || [];
      let pendingCount = 0;
      let completedCount = 0;
      
      // Single pass through statuses
      const statusWithMetrics = statuses.map(status => {
        if (status.status === 'pending') pendingCount++;
        if (status.status === 'approved') completedCount++;
        
        return {
          ...status,
          response_time: calculateResponseTime(app.created_at, status.created_at, status.action_at)
        };
      });

      const totalResponseTime = calculateTotalResponseTime(statusWithMetrics);

      return {
        ...app,
        no_dues_status: statusWithMetrics,
        total_response_time: totalResponseTime,
        pending_departments: pendingCount,
        completed_departments: completedCount
      };
    });

    const responseData = {
      applications: applicationsWithMetrics,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    };

    // ⚡ PERFORMANCE: Cache the response
    dashboardCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    const queryTime = Date.now() - startTime;
    console.log(`✅ Dashboard data fetched in ${queryTime}ms`);

    return NextResponse.json(responseData);

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

// ⚡ PERFORMANCE: Cache invalidation endpoint for real-time updates
export async function DELETE(request) {
  try {
    dashboardCache.clear();
    console.log('🗑️ Dashboard cache cleared');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}