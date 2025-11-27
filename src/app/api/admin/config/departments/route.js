import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const { data: departments, error } = await supabaseAdmin
      .from('departments')
      .select('name, display_name, display_order, is_school_specific')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching departments:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch departments',
          departments: []
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
        error: 'Internal server error',
        departments: []
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

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Department ID is required' },
        { status: 400 }
      );
    }

    const updates = {};
    if (body.display_name !== undefined) updates.display_name = body.display_name;
    if (body.email !== undefined) updates.email = body.email;
    if (body.display_order !== undefined) updates.display_order = body.display_order;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('departments')
      .update(updates)
      .eq('name', body.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data,
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