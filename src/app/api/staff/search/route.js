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
    const query = searchParams.get('q');
    const userId = searchParams.get('userId');

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify user has department or admin role (Phase 1: only 2 roles)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, department_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile || (profile.role !== 'department' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Search for students based on query
    // If user is admin, search all students
    // If user is department staff, search students in their department
    let formsQuery = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        student_name,
        registration_no,
        course,
        branch,
        contact_no,
        created_at,
        status
      `)
      .or(`student_name.ilike.%${query}%,registration_no.ilike.%${query}%`)
      .limit(20);

    if (profile.role === 'department') {
      // Department staff can only see forms related to their department
      formsQuery = formsQuery.in('id', supabaseAdmin
        .from('no_dues_status')
        .select('form_id', { head: true })
        .eq('department_name', profile.department_name)
      );
    }

    const { data: results, error: searchError } = await formsQuery;

    if (searchError) {
      return NextResponse.json({ error: searchError.message }, { status: 500 });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}