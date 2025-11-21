import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { finalizeCertificate } from '@/lib/certificateService';

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { formId } = await request.json();

    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Check if all departments have approved
    const { data: statuses, error: statusError } = await supabaseAdmin
      .from('no_dues_status')
      .select('status')
      .eq('form_id', formId);

    if (statusError) {
      console.error('Error fetching statuses:', statusError);
      return NextResponse.json(
        { error: 'Failed to fetch approval status' },
        { status: 500 }
      );
    }

    // Count total departments (should be 12)
    const totalDepartments = statuses.length;
    const approvedDepartments = statuses.filter(s => s.status === 'approved').length;
    const rejectedDepartments = statuses.filter(s => s.status === 'rejected').length;

    // Check if any department rejected
    if (rejectedDepartments > 0) {
      return NextResponse.json(
        {
          error: 'Cannot generate certificate. One or more departments have rejected the application.',
          approved: approvedDepartments,
          total: totalDepartments,
          rejected: rejectedDepartments
        },
        { status: 400 }
      );
    }

    // Check if all departments approved
    if (approvedDepartments !== totalDepartments) {
      return NextResponse.json(
        {
          error: 'Cannot generate certificate. Not all departments have approved yet.',
          approved: approvedDepartments,
          total: totalDepartments,
          pending: totalDepartments - approvedDepartments
        },
        { status: 400 }
      );
    }

    // Check if certificate already exists
    const { data: form, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('certificate_url')
      .eq('id', formId)
      .single();

    if (formError) {
      console.error('Error fetching form:', formError);
      return NextResponse.json(
        { error: 'Failed to fetch form data' },
        { status: 500 }
      );
    }

    if (form.certificate_url) {
      return NextResponse.json(
        {
          success: true,
          message: 'Certificate already exists',
          certificateUrl: form.certificate_url,
          alreadyGenerated: true
        },
        { status: 200 }
      );
    }

    // Generate certificate
    const result = await finalizeCertificate(formId);

    return NextResponse.json(
      {
        success: true,
        message: 'Certificate generated successfully',
        certificateUrl: result.certificateUrl,
        formId: result.formId
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Certificate generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate certificate',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if certificate can be generated
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Check form
    const { data: form, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        certificate_url
      `)
      .eq('id', formId)
      .single();

    if (formError) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Fetch statuses separately
    const { data: statuses, error: statusesError } = await supabaseAdmin
      .from('no_dues_status')
      .select('status')
      .eq('form_id', formId);

    if (statusesError) {
      return NextResponse.json(
        { error: 'Failed to fetch statuses' },
        { status: 500 }
      );
    }

    const totalDepartments = statuses.length;
    const approvedDepartments = statuses.filter(s => s.status === 'approved').length;
    const rejectedDepartments = statuses.filter(s => s.status === 'rejected').length;
    const pendingDepartments = totalDepartments - approvedDepartments - rejectedDepartments;

    const canGenerate = approvedDepartments === totalDepartments && rejectedDepartments === 0;

    return NextResponse.json({
      canGenerate,
      alreadyGenerated: !!form.certificate_url,
      certificateUrl: form.certificate_url,
      stats: {
        total: totalDepartments,
        approved: approvedDepartments,
        rejected: rejectedDepartments,
        pending: pendingDepartments
      }
    });

  } catch (error) {
    console.error('Error checking certificate status:', error);
    return NextResponse.json(
      { error: 'Failed to check certificate status' },
      { status: 500 }
    );
  }
}