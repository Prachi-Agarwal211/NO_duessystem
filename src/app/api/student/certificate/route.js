export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * GET /api/student/certificate?formId=XXX&registrationNo=XXX
 * 
 * Download/access No Dues certificate
 * 
 * Phase 1: Students have NO authentication, so we verify access by registration number
 * instead of user authentication.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const registrationNo = searchParams.get('registrationNo');

    // ==================== VALIDATION ====================
    
    if (!formId && !registrationNo) {
      return NextResponse.json({ 
        success: false,
        error: 'Either Form ID or Registration Number is required' 
      }, { status: 400 });
    }

    // ==================== FETCH FORM DATA ====================
    
    let query = supabase
      .from('no_dues_forms')
      .select(`
        id,
        user_id,
        student_name,
        registration_no,
        course,
        branch,
        session_from,
        session_to,
        status,
        final_certificate_generated,
        certificate_url
      `);

    // Query by formId or registrationNo
    if (formId) {
      query = query.eq('id', formId);
    } else {
      query = query.eq('registration_no', registrationNo.trim().toUpperCase());
    }

    const { data: formData, error: formError } = await query.single();

    if (formError) {
      if (formError.code === 'PGRST116') {
        return NextResponse.json({ 
          success: false,
          error: 'Application not found' 
        }, { status: 404 });
      }
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch application data' 
      }, { status: 500 });
    }

    if (!formData) {
      return NextResponse.json({ 
        success: false,
        error: 'Application not found' 
      }, { status: 404 });
    }

    // ==================== AUTHORIZATION (Phase 1 Compatible) ====================
    
    // Phase 1: Students don't have authentication
    // Authorization is done by providing the correct registration number
    // This is secure enough for Phase 1 since:
    // 1. Registration numbers are not publicly listed
    // 2. Students need to know their own registration number
    // 3. Certificates are not sensitive documents (they're proof of clearance)
    
    let canAccess = false;

    // Check if user is authenticated (staff/admin)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Authenticated users: check if they're staff or admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, department_name, id')
        .eq('id', session.user.id)
        .single();

      if (!profileError && profile) {
        // Admin can access all certificates
        if (profile.role === 'admin') {
          canAccess = true;
        }
        // Staff members can access completed forms
        else if (profile.role === 'staff' && formData.status === 'completed') {
          canAccess = true;
        }
      }
    } else {
      // Non-authenticated access (students)
      // Allow access if registration number matches
      if (registrationNo && registrationNo.trim().toUpperCase() === formData.registration_no) {
        canAccess = true;
      }
    }

    if (!canAccess) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized to access this certificate' 
      }, { status: 403 });
    }

    // ==================== CHECK CERTIFICATE EXISTS ====================
    
    if (!formData.final_certificate_generated || !formData.certificate_url) {
      return NextResponse.json({ 
        success: false,
        error: 'Certificate not yet generated. Please wait for all departments to approve.',
        status: formData.status,
        certificateReady: false
      }, { status: 404 });
    }

    // ==================== RETURN CERTIFICATE INFO ====================
    
    return NextResponse.json({ 
      success: true,
      certificateReady: true,
      data: {
        certificate_url: formData.certificate_url,
        student_name: formData.student_name,
        registration_no: formData.registration_no,
        course: formData.course,
        branch: formData.branch,
        session_from: formData.session_from,
        session_to: formData.session_to,
        status: formData.status
      }
    });

  } catch (error) {
    console.error('Certificate API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}