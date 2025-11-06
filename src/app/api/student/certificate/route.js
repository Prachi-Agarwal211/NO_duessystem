import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
    }

    // Get form details to verify the user can access this certificate
    const { data: formData, error: formError } = await supabase
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
      `)
      .eq('id', formId)
      .single();

    if (formError || !formData) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Verify user can access this certificate (owner or authorized staff)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, department_name, id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is authorized to access this certificate
    let canAccess = false;
    if (profile.role === 'student' && formData.user_id === session.user.id) {
      canAccess = true;
    } else if (profile.role === 'registrar') {
      canAccess = true;
    } else if (profile.role === 'department') {
      // Staff can access if form is completed (all approvals done)
      if (formData.status === 'completed') {
        canAccess = true;
      }
    }

    if (!canAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if certificate exists
    if (!formData.final_certificate_generated || !formData.certificate_url) {
      return NextResponse.json({ error: 'Certificate not yet generated' }, { status: 404 });
    }

    // In a real implementation, you would either:
    // 1. Redirect to the stored certificate URL, or
    // 2. Generate the certificate dynamically and return it

    // For now, return the certificate URL
    return NextResponse.json({ 
      certificate_url: formData.certificate_url,
      student_name: formData.student_name,
      registration_no: formData.registration_no
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}