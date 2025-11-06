import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get session and verify user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role and department
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, department_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify user has staff or registrar role
    if (profile.role !== 'department' && profile.role !== 'registrar') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let dashboardData = {};

    if (profile.role === 'registrar') {
      // Registrar gets all completed applications awaiting final approval
      const { data: completedApplications, error: completedError } = await supabase
        .from('no_dues_forms')
        .select(`
          id,
          student_name,
          registration_no,
          course,
          branch,
          contact_no,
          created_at,
          updated_at,
          no_dues_status (
            id,
            department_name,
            status,
            action_at,
            action_by_user_id,
            profiles (
              full_name
            )
          )
        `)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (completedError) {
        return NextResponse.json({ error: completedError.message }, { status: 500 });
      }

      // Get total count for pagination
      const { count: totalCount, error: countError } = await supabase
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
      }

      dashboardData = {
        role: 'registrar',
        applications: completedApplications || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        }
      };
    } else if (profile.role === 'department') {
      // Department staff gets applications pending for their department
      const { data: pendingApplications, error: pendingError } = await supabase
        .from('no_dues_status')
        .select(`
          id,
          form_id,
          department_name,
          status,
          rejection_reason,
          action_at,
          action_by_user_id,
          no_dues_forms (
            id,
            student_name,
            registration_no,
            course,
            branch,
            contact_no,
            created_at,
            updated_at,
            status
          )
        `)
        .eq('department_name', profile.department_name)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (pendingError) {
        return NextResponse.json({ error: pendingError.message }, { status: 500 });
      }

      // Get total count for pagination
      const { count: totalCount, error: countError } = await supabase
        .from('no_dues_status')
        .select('*', { count: 'exact', head: true })
        .eq('department_name', profile.department_name)
        .eq('status', 'pending');

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
      }

      dashboardData = {
        role: 'department',
        department: profile.department_name,
        applications: pendingApplications || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        }
      };
    }

    return NextResponse.json({ 
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Staff Dashboard API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}