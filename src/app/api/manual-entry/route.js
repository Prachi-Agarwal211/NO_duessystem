import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/manual-entry
 * Submit a manual entry for offline no-dues certificate
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    const {
      registration_no,
      student_name,
      personal_email,
      college_email,
      session_from,
      session_to,
      parent_name,
      school,
      course,
      branch,
      country_code,
      contact_no,
      certificate_screenshot_url,
      school_id,
      course_id,
      branch_id
    } = body;

    // Validate required fields
    if (!registration_no || !student_name || !personal_email || !college_email || 
        !session_from || !session_to || !school || !contact_no || !certificate_screenshot_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if registration number already exists in manual entries
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('manual_entries')
      .select('id, status')
      .eq('registration_no', registration_no)
      .single();

    if (existing) {
      return NextResponse.json(
        { 
          error: 'Manual entry already exists',
          details: `A manual entry with registration number ${registration_no} already exists with status: ${existing.status}`
        },
        { status: 409 }
      );
    }

    // Check if registration number exists in regular forms
    const { data: existingForm } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, status')
      .eq('registration_no', registration_no)
      .single();

    if (existingForm) {
      return NextResponse.json(
        { 
          error: 'Form already exists',
          details: `A no-dues form with registration number ${registration_no} already exists in the system`
        },
        { status: 409 }
      );
    }

    // Insert manual entry
    const { data: manualEntry, error: insertError } = await supabaseAdmin
      .from('manual_entries')
      .insert([{
        registration_no,
        student_name,
        personal_email,
        college_email,
        session_from,
        session_to,
        parent_name,
        school,
        course,
        branch,
        country_code: country_code || '+91',
        contact_no,
        certificate_screenshot_url,
        school_id,
        course_id,
        branch_id,
        status: 'pending'
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting manual entry:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit manual entry', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Manual entry submitted successfully',
      data: manualEntry
    }, { status: 201 });

  } catch (error) {
    console.error('Error in manual entry submission:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/manual-entry
 * Get all manual entries (admin only)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('manual_entries')
      .select(`
        *,
        config_schools:school_id (name),
        config_courses:course_id (name, level),
        config_branches:branch_id (name),
        profiles:approved_by (full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching manual entries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch manual entries', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error in manual entry fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}