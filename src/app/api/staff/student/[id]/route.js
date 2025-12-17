import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('🔍 Student Detail API Called - Form ID:', id, 'User ID:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user profile to check role and department using admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, department_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify user has staff or admin role
    if (profile.role !== 'department' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the student's no dues form
    let formQuery = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        user_id,
        student_name,
        registration_no,
        admission_year,
        passing_year,
        parent_name,
        school,
        course,
        branch,
        contact_no,
        alumni_screenshot_url,
        certificate_url,
        status,
        is_manual_entry,
        manual_status,
        manual_certificate_url,
        created_at,
        updated_at,
        reapplication_count,
        student_reply_message,
        last_reapplied_at,
        profiles!no_dues_forms_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('id', id);

    // If user is staff member, verify they can access this form
    if (profile.role === 'department') {
      // First get the form to check if it's a manual entry
      const { data: formCheck } = await supabaseAdmin
        .from('no_dues_forms')
        .select('is_manual_entry')
        .eq('id', id)
        .single();

      // Manual entries don't have department statuses, skip authorization check for them
      if (!formCheck?.is_manual_entry) {
        // Check if this form has a status entry for the user's department
        const { data: departmentStatus, error: statusError } = await supabaseAdmin
          .from('no_dues_status')
          .select('form_id')
          .eq('form_id', id)
          .eq('department_name', profile.department_name)
          .single();

        if (statusError || !departmentStatus) {
          return NextResponse.json({ error: 'Unauthorized to access this student' }, { status: 403 });
        }
      }
    }

    const { data: formData, error: formError } = await formQuery.single();

    console.log('📝 Form Query Result:', {
      found: !!formData,
      error: formError?.message || formError?.code,
      formId: id,
      department: profile.department_name
    });

    if (formError) {
      console.error('❌ Form Error Details:', formError);
      return NextResponse.json({
        error: 'Student form not found',
        details: formError.message,
        formId: id
      }, { status: 404 });
    }

    if (!formData) {
      console.error('❌ No form data returned for ID:', id);
      return NextResponse.json({ error: 'Student form not found' }, { status: 404 });
    }

    console.log('✅ Form found:', formData.student_name, formData.registration_no,
      'Is Manual Entry:', formData.is_manual_entry);

    let completeStatuses = [];

    // Only fetch department statuses for regular forms, not manual entries
    if (!formData.is_manual_entry) {
      // Get all department statuses for this form
      const { data: departmentStatuses, error: statusError } = await supabaseAdmin
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
      const { data: departments, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('name, display_name')
        .order('display_order');

      if (deptError) {
        return NextResponse.json({ error: deptError.message }, { status: 500 });
      }

      // Create a complete status list with all departments
      completeStatuses = departments.map(dept => {
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
    }

    // Format the response
    const studentData = {
      form: {
        id: formData.id,
        student_name: formData.student_name,
        registration_no: formData.registration_no,
        admission_year: formData.admission_year,
        passing_year: formData.passing_year,
        parent_name: formData.parent_name,
        school: formData.school,
        course: formData.course,
        branch: formData.branch,
        contact_no: formData.contact_no,
        alumni_screenshot_url: formData.alumni_screenshot_url,
        certificate_url: formData.certificate_url,
        status: formData.status,
        is_manual_entry: formData.is_manual_entry || false,
        manual_status: formData.manual_status || null,
        manual_certificate_url: formData.manual_certificate_url || null,
        created_at: formData.created_at,
        updated_at: formData.updated_at,
        user_email: formData.profiles?.email,
        reapplication_count: formData.reapplication_count || 0,
        student_reply_message: formData.student_reply_message || null,
        last_reapplied_at: formData.last_reapplied_at || null
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