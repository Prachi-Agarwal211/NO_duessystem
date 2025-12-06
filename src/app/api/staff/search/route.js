export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0; // Disable all caching

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateAndVerify } from '@/lib/authHelpers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Authenticate and verify role
    const auth = await authenticateAndVerify(request, ['department', 'admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { profile } = auth;

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