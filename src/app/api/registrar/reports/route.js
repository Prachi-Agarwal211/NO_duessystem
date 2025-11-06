import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reportType = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId || !reportType) {
      return NextResponse.json({ error: 'User ID and report type are required' }, { status: 400 });
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

    let reportData = {};

    switch (reportType) {
      case 'applications-over-time':
        // Get applications grouped by date
        const { data: appOverTime, error: appOverTimeError } = await supabase
          .rpc('get_applications_over_time', {
            start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to last 30 days
            end_date: endDate || new Date().toISOString().split('T')[0]
          });

        if (appOverTimeError) {
          return NextResponse.json({ error: appOverTimeError.message }, { status: 500 });
        }

        reportData = appOverTime;
        break;

      case 'department-performance':
        // Get performance by department
        const { data: deptPerformance, error: deptPerformanceError } = await supabase
          .from('no_dues_status')
          .select(`
            department_name,
            status,
            count(*) as count
          `)
          .group('department_name, status')
          .order('department_name');

        if (deptPerformanceError) {
          return NextResponse.json({ error: deptPerformanceError.message }, { status: 500 });
        }

        // Transform data for better readability
        const performanceByDept = {};
        deptPerformance.forEach(item => {
          if (!performanceByDept[item.department_name]) {
            performanceByDept[item.department_name] = {};
          }
          performanceByDept[item.department_name][item.status] = parseInt(item.count);
        });

        reportData = performanceByDept;
        break;

      case 'pending-by-department':
        // Get pending applications by department
        const { data: pendingByDept, error: pendingByDeptError } = await supabase
          .from('no_dues_status')
          .select(`
            department_name,
            count(*) as pending_count
          `)
          .eq('status', 'pending')
          .group('department_name')
          .order('pending_count', { ascending: false });

        if (pendingByDeptError) {
          return NextResponse.json({ error: pendingByDeptError.message }, { status: 500 });
        }

        reportData = pendingByDept;
        break;

      case 'completions':
        // Get completed applications by department
        const { data: completions, error: completionsError } = await supabase
          .from('no_dues_status')
          .select(`
            department_name,
            count(*) as completed_count
          `)
          .eq('status', 'approved')
          .group('department_name')
          .order('completed_count', { ascending: false });

        if (completionsError) {
          return NextResponse.json({ error: completionsError.message }, { status: 500 });
        }

        reportData = completions;
        break;

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json({ 
      reportType,
      startDate,
      endDate,
      data: reportData 
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}