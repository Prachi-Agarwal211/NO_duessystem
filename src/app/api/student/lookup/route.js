import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');

    if (!registrationNo) {
      return NextResponse.json(
        { error: 'Registration number is required' },
        { status: 400 }
      );
    }

    // Clean the registration number
    const cleanRegNo = registrationNo.trim().toUpperCase();

    // Search by registration number (supports both EnrollNo and RollNo)
    const { data: studentData, error: fetchError } = await supabase
      .rpc('search_student_data', {
        p_search_term: cleanRegNo
      });

    if (fetchError) {
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (!studentData || studentData.length === 0) {
      return NextResponse.json(
        {
          error: 'Student not found',
          message: 'No student found with this registration number or roll number',
          searchedFor: cleanRegNo
        },
        { status: 404 }
      );
    }

    // Get the first (best) match
    const student = studentData[0];

    // Return all fields for the form
    const formData = {
      registration_no: student.registration_no,
      student_name: student.student_name,
      admission_year: student.admission_year?.toString() || '',
      passing_year: student.passing_year?.toString() || '',
      parent_name: student.parent_name || '',
      school: student.school_id || student.school || '', // Send ID if available for dropdowns
      course: student.course_id || student.course || '', // Send ID if available for dropdowns
      branch: student.branch_id || student.branch || '', // Send ID if available for dropdowns
      country_code: student.country_code || '+91',
      contact_no: student.contact_no || '',
      personal_email: student.personal_email || '',
      college_email: student.college_email || '',
      alumni_profile_link: student.alumniProfileLink || student.alumni_profile_link || '',
      no_dues_status: student.no_dues_status || 'not_applied',
      certificate_url: student.certificate_url || null
    };

    return NextResponse.json({
      success: true,
      data: formData,
      message: 'Student data found successfully'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { registration_no } = await request.json();

    if (!registration_no) {
      return NextResponse.json(
        { error: 'Registration number is required' },
        { status: 400 }
      );
    }

    // Same logic as GET but for POST requests
    const cleanRegNo = registration_no.trim().toUpperCase();

    const { data: studentData, error } = await supabase
      .rpc('get_student_by_regno', { p_registration_no: cleanRegNo });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database lookup failed' },
        { status: 500 }
      );
    }

    if (!studentData || studentData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Student not found in database',
          registration_no: cleanRegNo
        },
        { status: 404 }
      );
    }

    const student = studentData[0];

    const formData = {
      registration_no: student.registration_no,
      student_name: student.student_name || '',
      admission_year: student.admission_year?.toString() || '',
      passing_year: student.passing_year?.toString() || '',
      parent_name: student.parent_name || '',

      // UUIDs used for dropdown synchronization
      school: student.school_id || student.school || '',
      course: student.course_id || student.course || '',
      branch: student.branch_id || student.branch || '',

      country_code: student.country_code || '+91',
      contact_no: student.contact_no || '',
      personal_email: student.personal_email || '',
      college_email: student.college_email || '',
      alumni_profile_link: student.alumniProfileLink || student.alumni_profile_link || '',

      // Master Sync Fields
      no_dues_status: student.no_dues_status || 'not_applied',
      certificate_url: student.certificate_url || null,

      // Additional fields from master record
      batch: student.batch || '',
      section: student.section || '',
      semester: student.semester?.toString() || '',
      cgpa: student.cgpa?.toString() || '',
      roll_number: student.roll_number || '',
      enrollment_number: student.enrollment_number || '',
      date_of_birth: student.date_of_birth || '',
      gender: student.gender || '',
      category: student.category || '',
      blood_group: student.blood_group || '',
      address: student.address || '',
      city: student.city || '',
      state: student.state || '',
      pin_code: student.pin_code || '',
      emergency_contact_name: student.emergency_contact_name || '',
      emergency_contact_no: student.emergency_contact_no || ''
    };

    return NextResponse.json({
      success: true,
      data: formData,
      message: 'Student data found successfully'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
