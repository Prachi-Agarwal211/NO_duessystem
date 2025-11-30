import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Validate required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper: Verify admin user
async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { error: 'No authorization header', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { error: 'Invalid token', status: 401 };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: 'Unauthorized', status: 403 };
  }

  return { userId: user.id };
}

/**
 * GET /api/admin/config/departments
 * Fetch all active departments for CSV export and other admin operations
 */
export async function GET(request) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (adminCheck.error) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
      .from('departments')
      .select('name, display_name, email, display_order, is_school_specific, is_active')
      .order('display_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: departments, error } = await query;

    if (error) {
      console.error('Error fetching departments:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch departments'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      departments: departments || []
    });
  } catch (error) {
    console.error('Error in departments config API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update department (Admin only)
export async function PUT(request) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (adminCheck.error) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Department name is required' },
        { status: 400 }
      );
    }

    // Validate inputs
    const updates = {};
    
    if (body.display_name !== undefined) {
      if (typeof body.display_name !== 'string' || body.display_name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Display name must be a non-empty string' },
          { status: 400 }
        );
      }
      if (body.display_name.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Display name must be 100 characters or less' },
          { status: 400 }
        );
      }
      updates.display_name = body.display_name.trim();
    }
    
    if (body.email !== undefined) {
      if (body.email !== null && body.email !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
          return NextResponse.json(
            { success: false, error: 'Invalid email format' },
            { status: 400 }
          );
        }
      }
      updates.email = body.email || null;
    }
    
    if (body.display_order !== undefined) {
      const order = Number(body.display_order);
      if (!Number.isInteger(order) || order < 0) {
        return NextResponse.json(
          { success: false, error: 'Display order must be a non-negative integer' },
          { status: 400 }
        );
      }
      updates.display_order = order;
    }
    
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'is_active must be a boolean' },
          { status: 400 }
        );
      }
      updates.is_active = body.is_active;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('departments')
      .update(updates)
      .eq('name', body.name)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      department: data
    });
  } catch (error) {
    console.error('PUT departments error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}