export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateAndVerify } from '@/lib/authHelpers';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AdminConfigBranchesAPI');

// GET - Fetch branches (optionally filtered by course)
export async function GET(request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
      .from('config_branches')
      .select(`
        *,
        config_courses (
          id,
          name,
          config_schools (
            id,
            name
          )
        )
      `)
      .order('display_order');

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('GET branches error', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Add new branch (Admin only)
export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const adminCheck = await authenticateAndVerify(request, 'admin');
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.statusCode }
      );
    }

    const body = await request.json();

    // Validation
    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Branch name is required' },
        { status: 400 }
      );
    }

    if (!body.course_id) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify course exists
    const { data: course } = await supabaseAdmin
      .from('config_courses')
      .select('id')
      .eq('id', body.course_id)
      .single();

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check for duplicate within same course
    const { data: existing } = await supabaseAdmin
      .from('config_branches')
      .select('id')
      .eq('course_id', body.course_id)
      .eq('name', body.name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Branch with this name already exists in this course' },
        { status: 409 }
      );
    }

    // Get max display_order for this course
    const { data: maxOrder } = await supabaseAdmin
      .from('config_branches')
      .select('display_order')
      .eq('course_id', body.course_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = maxOrder ? maxOrder.display_order + 1 : 1;

    // Insert
    const { data, error } = await supabaseAdmin
      .from('config_branches')
      .insert([{
        course_id: body.course_id,
        name: body.name.trim(),
        display_order: body.display_order ?? nextOrder,
        is_active: body.is_active ?? true
      }])
      .select(`
        *,
        config_courses (
          id,
          name,
          config_schools (
            id,
            name
          )
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error('POST branches error', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update branch (Admin only)
export async function PUT(request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const adminCheck = await authenticateAndVerify(request, 'admin');
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.statusCode }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Branch ID is required' },
        { status: 400 }
      );
    }

    const updates = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.course_id !== undefined) updates.course_id = body.course_id;
    if (body.display_order !== undefined) updates.display_order = body.display_order;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('config_branches')
      .update(updates)
      .eq('id', body.id)
      .select(`
        *,
        config_courses (
          id,
          name,
          config_schools (
            id,
            name
          )
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('PUT branches error', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete branch (Admin only, with safety checks)
export async function DELETE(request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const adminCheck = await authenticateAndVerify(request, 'admin');
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.statusCode }
      );
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('id');

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'Branch ID is required' },
        { status: 400 }
      );
    }

    // Check if branch has students
    const { count: studentCount } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    if (studentCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete branch: ${studentCount} student(s) are enrolled. Consider deactivating instead.` 
        },
        { status: 409 }
      );
    }

    // Safe to delete
    const { error } = await supabaseAdmin
      .from('config_branches')
      .delete()
      .eq('id', branchId);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Branch deleted successfully' 
    });
  } catch (error) {
    logger.error('DELETE branches error', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}