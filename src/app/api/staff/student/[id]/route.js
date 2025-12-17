import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // ✅ SECURE AUTH: Get userId from Authorization header token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const userId = user.id; // ✅ From verified token
    console.log('🔍 Student Detail API Called - Form ID:', id, 'User ID:', userId);

    // Get user profile to check role and department using admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, assigned_department_ids, department_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify user has staff or admin role
    if (profile.role !== 'department' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the student's no dues form (✅ removed manual entry fields)
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
    // ✅ All forms are now online-only, so always check department authorization
    if (profile.role === 'department') {
      // Get department names from assigned UUIDs
      const { data: myDepartments } = await supabaseAdmin
        .from('departments')
        .select('name')
        .in('id', profile.assigned_department_ids || []);
      
      const myDeptNames = myDepartments?.map(d => d.name) || [];
      
      // Check if this form has a status entry for ANY of the user's departments
      const { data: departmentStatus, error: statusError } = await supabaseAdmin
        .from('no_dues_status')
        .select('form_id')
        .eq('form_id', id)
        .in('department_name', myDeptNames);

      if (statusError || !departmentStatus || departmentStatus.length === 0) {
        return NextResponse.json({ error: 'Unauthorized to access this student' }, { status: 403 });
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

    console.log('✅ Form found:', formData.student_name, formData.registration_no);

    // Get all department statuses for this form (✅ all forms are online-only now)
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