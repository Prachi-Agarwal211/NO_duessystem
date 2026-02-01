export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import applicationService from '@/lib/services/ApplicationService';

// ✅ CRITICAL FIX: Force Supabase to bypass all caching layers (same as Admin Dashboard)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        });
      },
    },
  }
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
    // Get the student's no dues form (FK relationship missing, so we'll fetch profile separately)
    let formQuery = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        student_name,
        registration_no,
        admission_year,
        passing_year,
        parent_name,
        school,
        course,
        branch,
        contact_no,
        alumni_profile_link,
        certificate_url,
        status,
        created_at,
        updated_at,
        reapplication_count,
        student_reply_message,
        last_reapplied_at
      `)
      .eq('id', id);

    // If user is staff member, verify they can access this form
    // ✅ All forms are now online-only, so always check department authorization
    if (profile.role === 'department') {
      // Get department names from assigned UUIDs
      const { data: myDepartments, error: deptLookupError } = await supabaseAdmin
        .from('departments')
        .select('name')
        .in('id', profile.assigned_department_ids || []);

      console.log('🔒 Auth Check - Form ID:', id);
      console.log('🔒 Auth Check - User ID:', userId);
      console.log('🔒 Auth Check - Assigned Dept IDs:', profile.assigned_department_ids);
      console.log('🔒 Auth Check - Dept Lookup Error:', deptLookupError);
      console.log('🔒 Auth Check - My Departments:', myDepartments);

      const myDeptNames = myDepartments?.map(d => d.name) || [];
      console.log('🔒 Auth Check - My Dept Names:', myDeptNames);

      // Check if this form has a status entry for ANY of the user's departments
      let { data: departmentStatus, error: statusError } = await supabaseAdmin
        .from('no_dues_status')
        .select('form_id, department_name')
        .eq('form_id', id)
        .in('department_name', myDeptNames);

      // ⚡ SELF-HEALING & FALLBACK: If status not found, try to repair it
      if (!statusError && (!departmentStatus || departmentStatus.length === 0)) {
        console.log('🔧 Self-healing triggered for form:', id);

        // 1. If staff has no UUIDs but has a department_name, use it
        const fallbackDeptName = profile.department_name;
        if (fallbackDeptName && !myDeptNames.includes(fallbackDeptName)) {
          console.log('📋 Using fallback department_name:', fallbackDeptName);
          await applicationService.ensureStatusRecord(id, fallbackDeptName);
        } else {
          // 2. Try to repair all relevant departments
          for (const deptName of myDeptNames) {
            await applicationService.ensureStatusRecord(id, deptName);
          }
        }

        // 3. Retry the status check
        const retryResult = await supabaseAdmin
          .from('no_dues_status')
          .select('form_id, department_name')
          .eq('form_id', id)
          .in('department_name', fallbackDeptName ? [...myDeptNames, fallbackDeptName] : myDeptNames);

        departmentStatus = retryResult.data;
        statusError = retryResult.error;
      }

      console.log('🔒 Auth Check - Status Query Error:', statusError);
      console.log('🔒 Auth Check - Department Status Found:', departmentStatus);
      console.log('🔒 Auth Check - Status Count:', departmentStatus?.length || 0);

      if (statusError || !departmentStatus || departmentStatus.length === 0) {
        console.log('❌ Auth FAILED - Returning 403');
        return NextResponse.json({
          error: 'Unauthorized to access this student',
          debug: {
            formId: id,
            myDepartments: myDeptNames,
            statusFound: departmentStatus?.length || 0
          }
        }, { status: 403 });
      }

      console.log('✅ Auth PASSED - User can access this form');
    }

    const { data: formData, error: formError } = await formQuery.single();

    if (formError) {
      console.error('❌ Student form fetch error (Orphaned Record?):', formError);

      // If the form doesn't exist but we passed the status check, it's an orphaned record
      if (formError.code === 'PGRST116') { // PostgREST code for no rows found
        console.warn('🚨 ORPHANED RECORD DETECTED: Form', id, 'exists in no_dues_status but NOT in no_dues_forms');

        // Potential self-healing: we could delete the orphaned status records here, 
        // but it's safer to just report it for now to avoid accidental data loss.
        return NextResponse.json({
          error: 'Student application form no longer exists (Orphaned Record)',
          details: 'The status record exists but the main form data is missing. This usually happens if a form was deleted but status records remained.',
          formId: id,
          isOrphaned: true
        }, { status: 404 });
      }

      return NextResponse.json({
        error: 'Student form not found',
        details: formError.message,
        formId: id
      }, { status: 404 });
    }

    if (!formData) {
      return NextResponse.json({ error: 'Student form not found' }, { status: 404 });
    }

    // Fetch profile separately since FK join failed
    let userEmail = null;
    let userFullName = null;

    if (formData.registration_no) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('registration_no', formData.registration_no)
        .maybeSingle();

      if (profileData) {
        userEmail = profileData.email;
        userFullName = profileData.full_name;
      }
    }

    // Get all department statuses for this form
    const { data: departmentStatuses, error: statusError } = await supabaseAdmin
      .from('no_dues_status')
      .select(`
        id,
        department_name,
        status,
        rejection_reason,
        action_at,
        action_by_user_id
      `)
      .eq('form_id', id)
      .order('department_name');

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 });
    }

    // Fetch profile names for action_by_user_id
    const userIds = departmentStatuses
      .map(s => s.action_by_user_id)
      .filter(id => id); // Filter out nulls

    let userMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profiles) {
        profiles.forEach(p => {
          userMap[p.id] = p.full_name;
        });
      }
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
        action_by: status ? userMap[status.action_by_user_id] : null
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
        alumni_profile_link: formData.alumni_profile_link,
        certificate_url: formData.certificate_url,
        status: formData.status,
        created_at: formData.created_at,
        updated_at: formData.updated_at,
        user_email: userEmail,
        reapplication_count: formData.reapplication_count || 0,
        student_reply_message: formData.student_reply_message || null,
        last_reapplied_at: formData.last_reapplied_at || null
      },
      departmentStatuses: completeStatuses
    };

    return NextResponse.json({
      success: true,
      data: studentData
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Staff Student Detail API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}