import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify user is registrar
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'registrar') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all completed applications (awaiting final approval)
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
        updated_at
      `)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false });

    if (completedError) {
      return NextResponse.json({ error: completedError.message }, { status: 500 });
    }

    // Get all applications by status
    const { data: allApplications, error: allError } = await supabase
      .from('no_dues_forms')
      .select(`
        id,
        student_name,
        registration_no,
        course,
        branch,
        contact_no,
        status,
        created_at,
        updated_at
      `)
      .order('updated_at', { ascending: false });

    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    // Get stats by status
    const statsByStatus = allApplications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    // Get recent activity (last 10 status updates)
    const { data: recentActivity, error: activityError } = await supabase
      .from('no_dues_status')
      .select(`
        id,
        form_id,
        department_name,
        status,
        action_at,
        action_by_user_id,
        no_dues_forms!inner (
          student_name,
          registration_no
        )
      `)
      .not('action_at', 'is', null)
      .order('action_at', { ascending: false })
      .limit(10);

    if (activityError) {
      return NextResponse.json({ error: activityError.message }, { status: 500 });
    }

    // Format recent activity
    const formattedActivity = recentActivity.map(activity => ({
      id: activity.id,
      student_name: activity.no_dues_forms.student_name,
      registration_no: activity.no_dues_forms.registration_no,
      department: activity.department_name,
      status: activity.status,
      timestamp: activity.action_at
    }));

    return NextResponse.json({ 
      completedApplications,
      statsByStatus,
      recentActivity: formattedActivity,
      totalApplications: allApplications.length
    });
  } catch (error) {
    console.error('Error fetching registrar dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}