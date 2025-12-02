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

// GET - Fetch courses (optionally filtered by school)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
      .from('config_courses')
      .select(`
        *,
        config_schools (
          id,
          name
        )
      `)
      .order('display_order');

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET courses error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Add new course (Admin only)
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
        { success: false, error: 'Course name is required' },
        { status: 400 }
      );
    }

    if (!body.school_id) {
      return NextResponse.json(
        { success: false, error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Verify school exists
    const { data: school } = await supabaseAdmin
      .from('config_schools')
      .select('id')
      .eq('id', body.school_id)
      .single();

    if (!school) {
      return NextResponse.json(
        { success: false, error: 'School not found' },
        { status: 404 }
      );
    }

    // Check for duplicate within same school
    const { data: existing } = await supabaseAdmin
      .from('config_courses')
      .select('id')
      .eq('school_id', body.school_id)
      .eq('name', body.name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Course with this name already exists in this school' },
        { status: 409 }
      );
    }

    // Get max display_order for this school
    const { data: maxOrder } = await supabaseAdmin
      .from('config_courses')
      .select('display_order')
      .eq('school_id', body.school_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = maxOrder ? maxOrder.display_order + 1 : 1;

    // Insert
    const { data, error } = await supabaseAdmin
      .from('config_courses')
      .insert([{
        school_id: body.school_id,
        name: body.name.trim(),
        display_order: body.display_order ?? nextOrder,
        is_active: body.is_active ?? true
      }])
      .select(`
        *,
        config_schools (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('POST courses error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update course (Admin only)
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
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    const updates = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.school_id !== undefined) updates.school_id = body.school_id;
    if (body.display_order !== undefined) updates.display_order = body.display_order;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('config_courses')
      .update(updates)
      .eq('id', body.id)
      .select(`
        *,
        config_schools (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PUT courses error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete course (Admin only, with safety checks)
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
    const courseId = searchParams.get('id');

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Check if course has branches
    const { count } = await supabaseAdmin
      .from('config_branches')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    if (count > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete course: ${count} branch(es) are linked to it. Delete branches first.` 
        },
        { status: 409 }
      );
    }

    // Check if course has students
    const { count: studentCount } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    if (studentCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete course: ${studentCount} student(s) are enrolled. Consider deactivating instead.` 
        },
        { status: 409 }
      );
    }

    // Safe to delete
    const { error } = await supabaseAdmin
      .from('config_courses')
      .delete()
      .eq('id', courseId);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Course deleted successfully' 
    });
  } catch (error) {
    console.error('DELETE courses error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}