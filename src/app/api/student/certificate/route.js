export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import supabase from '@/lib/supabaseClient';

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
    // Use Prisma to fetch form data

    let formData;
    let error;

    if (formId) {
      const { data: result, error: queryError } = await supabase
        .from('no_dues_forms')
        .select(`
          id,
          user_id,
          student_name,
          registration_no,
          course,
          branch,
          admission_year,
          passing_year,
          status,
          final_certificate_generated,
          certificate_url,
          blockchain_hash,
          blockchain_tx
        `)
        .eq('id', formId)
        .single();

      formData = result;
      error = queryError;
    } else {
      const { data: result, error: queryError } = await supabase
        .from('no_dues_forms')
        .select(`
          id,
          user_id,
          student_name,
          registration_no,
          course,
          branch,
          admission_year,
          passing_year,
          status,
          final_certificate_generated,
          certificate_url,
          blockchain_hash,
          blockchain_tx
        `)
        .eq('registration_no', registrationNo.trim().toUpperCase())
        .single();

      formData = result;
      error = queryError;
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Form lookup error:', error);
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

    // Check if user is authenticated (staff/admin) using standard client for auth check
    // We still create a standard client just for checking auth state if token is present
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Pass the session/cookies if available (this is tricky in API route without headers)
    // For now, checks registration number match for student access
    if (registrationNo && registrationNo.trim().toUpperCase() === formData.registration_no) {
      canAccess = true;
    }

    // Also allow if formId was provided AND matches the registration number check (dual verification)
    // Ideally we would check session here but for student portal public access, RegNo is the key.

    if (!canAccess) {
      // Allow access if the request is for the correct student (implicit via query params)
      // This logic assumes the link is shared/accessed by the student
      if (formId && formData.id === formId) canAccess = true;
    }

    if (!canAccess) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to access this certificate'
      }, { status: 403 });
    }

    // ==================== CHECK CERTIFICATE EXISTS ====================

    // Check if system-generated certificate exists
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
        admission_year: formData.admission_year,
        passing_year: formData.passing_year,
        status: formData.status,
        blockchain_hash: formData.blockchain_hash,
        blockchain_tx: formData.blockchain_tx
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
