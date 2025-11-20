import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

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

    // Verify user has department or admin role (Phase 1: only 2 roles)
    if (profile.role !== 'department' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the student's no dues form
    let formQuery = supabase
      .from('no_dues_forms')
      .select(`
        id,
        user_id,
        student_name,
        registration_no,
        session_from,
        session_to,
        parent_name,
        school,
        course,
        branch,
        contact_no,
        alumni_screenshot_url,
        certificate_url,
        final_certificate_generated,
        status,
        created_at,
        updated_at,
        profiles (
          full_name,
          email
        )
      `)
      .eq('id', id);

    // If user is department staff, verify they can access this form
    if (profile.role === 'department') {
      // Check if this form has a status entry for the user's department
      const { data: departmentStatus, error: statusError } = await supabase
        .from('no_dues_status')
        .select('form_id')
        .eq('form_id', id)
        .eq('department_name', profile.department_name)
        .single();

      if (statusError || !departmentStatus) {
        return NextResponse.json({ error: 'Unauthorized to access this student' }, { status: 403 });
      }
    }

    const { data: formData, error: formError } = await formQuery.single();

    if (formError || !formData) {
      return NextResponse.json({ error: 'Student form not found' }, { status: 404 });
    }

    // Get all department statuses for this form
    const { data: departmentStatuses, error: statusError } = await supabase
      .from('no_dues_status')
      .select(`
        id,
        department_name,
        status,
        rejection_reason,
        action_at,
        action_by_user_id,
        profiles (
          full_name
        )
      `)
      .eq('form_id', id)
      .order('department_name');

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 });
    }

    // Get department information for all departments
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('name, display_name')
      .order('display_order');

    if (deptError) {
      return NextResponse.json({ error: deptError.message }, { status: 500 });
    }

    // Create a complete status list with all departments
    const completeStatuses = departments.map(dept => {
      const status = departmentStatuses.find(s => s.department_name === dept.name);
      return {
        department_name: dept.name,
        display_name: dept.display_name,
        status: status ? status.status : 'pending',
        rejection_reason: status ? status.rejection_reason : null,
        action_at: status ? status.action_at : null,
        action_by: status ? status.profiles?.full_name : null
      };
    });

    // Format the response
    const studentData = {
      form: {
        id: formData.id,
        student_name: formData.student_name,
        registration_no: formData.registration_no,
        session_from: formData.session_from,
        session_to: formData.session_to,
        parent_name: formData.parent_name,
        school: formData.school,
        course: formData.course,
        branch: formData.branch,
        contact_no: formData.contact_no,
        alumni_screenshot_url: formData.alumni_screenshot_url,
        certificate_url: formData.certificate_url,
        final_certificate_generated: formData.final_certificate_generated,
        status: formData.status,
        created_at: formData.created_at,
        updated_at: formData.updated_at,
        user_email: formData.profiles?.email
      },
      departmentStatuses: completeStatuses
    };

    return NextResponse.json({ 
      success: true,
      data: studentData
    });
  } catch (error) {
    console.error('Staff Student Detail API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}