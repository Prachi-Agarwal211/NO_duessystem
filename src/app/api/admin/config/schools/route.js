export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

  // Use service role to bypass RLS and avoid infinite recursion
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

// GET - Fetch all schools
export async function GET(request) {
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error', data: [] },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let query = supabaseAdmin
      .from('config_schools')
      .select('*')
      .order('display_order');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    // Return empty array if no data
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('GET schools error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch schools', data: [] },
      { status: 500 }
    );
  }
}

// POST - Add new school (Admin only)
export async function POST(request) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (adminCheck.error) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const body = await request.json();

    // Validation
    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'School name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('config_schools')
      .select('id')
      .eq('name', body.name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'School with this name already exists' },
        { status: 409 }
      );
    }

    // Get max display_order
    const { data: maxOrder } = await supabaseAdmin
      .from('config_schools')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = maxOrder ? maxOrder.display_order + 1 : 1;

    // Insert
    const { data, error } = await supabaseAdmin
      .from('config_schools')
      .insert([{
        name: body.name.trim(),
        display_order: body.display_order ?? nextOrder,
        is_active: body.is_active ?? true
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('POST schools error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update school (Admin only)
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
        { success: false, error: 'School ID is required' },
        { status: 400 }
      );
    }

    const updates = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.display_order !== undefined) updates.display_order = body.display_order;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('config_schools')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PUT schools error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete school (Admin only, with safety checks)
export async function DELETE(request) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (adminCheck.error) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('id');

    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Check if school has courses
    const { count } = await supabaseAdmin
      .from('config_courses')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    if (count > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete school: ${count} course(s) are linked to it. Delete courses first.` 
        },
        { status: 409 }
      );
    }

    // Check if school has students
    const { count: studentCount } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    if (studentCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete school: ${studentCount} student(s) are enrolled. Consider deactivating instead.` 
        },
        { status: 409 }
      );
    }

    // Safe to delete
    const { error } = await supabaseAdmin
      .from('config_schools')
      .delete()
      .eq('id', schoolId);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'School deleted successfully' 
    });
  } catch (error) {
    console.error('DELETE schools error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}