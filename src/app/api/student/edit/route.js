import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * PUT /api/student/edit
 * Allow students to edit their pending form (for fixing mistakes)
 * Different from reapply - this is for corrections without rejection context
 * 
 * Request body:
 * {
 *   registration_no: string (required)
 *   updated_form_data: object (required - fields to update)
 * }
 */
export async function PUT(request) {
  try {
    // Rate limiting: Prevent spam edit requests
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.SUBMIT);
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }

    const body = await request.json();
    const { registration_no, updated_form_data } = body;

    // ==================== VALIDATION ====================
    if (!registration_no?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Registration number is required'
      }, { status: 400 });
    }

    if (!updated_form_data || Object.keys(updated_form_data).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update'
      }, { status: 400 });
    }

    // ==================== GET CURRENT FORM ====================
    const { data: form, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, registration_no, status, student_name')
      .eq('registration_no', registration_no.trim().toUpperCase())
      .single();

    if (formError) {
      if (formError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Form not found'
        }, { status: 404 });
      }
      throw formError;
    }

    // ==================== CHECK EDIT ELIGIBILITY ====================
    // Only allow editing for pending or rejected forms
    if (form.status === 'completed') {
      return NextResponse.json({
        success: false,
        error: 'Cannot edit a completed form'
      }, { status: 403 });
    }

    // ==================== INPUT SANITIZATION ====================
    // SECURITY: Allowlist of fields students can modify
    const ALLOWED_FIELDS = [
      'student_name',
      'parent_name',
      'session_from',
      'session_to',
      'school',
      'course',
      'branch',
      'country_code',
      'contact_no',
      'personal_email',
      'college_email'
    ];

    // SECURITY: Fields that are STRICTLY FORBIDDEN to prevent attacks
    const PROTECTED_FIELDS = [
      'id',
      'registration_no',
      'status',
      'created_at',
      'updated_at',
      'reapplication_count',
      'is_reapplication',
      'last_reapplied_at',
      'student_reply_message'
    ];

    // Check for attempts to modify protected fields
    for (const field of PROTECTED_FIELDS) {
      if (updated_form_data.hasOwnProperty(field)) {
        return NextResponse.json({
          success: false,
          error: `Cannot modify protected field: ${field}`
        }, { status: 403 });
      }
    }

    // Only keep allowed fields
    const sanitizedData = {};
    for (const field of ALLOWED_FIELDS) {
      if (updated_form_data.hasOwnProperty(field)) {
        sanitizedData[field] = updated_form_data[field];
      }
    }

    // Check if there are any fields left after sanitization
    if (Object.keys(sanitizedData).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update'
      }, { status: 400 });
    }

    // ==================== VALIDATE SANITIZED FIELDS ====================
    // Don't allow editing registration number (double-check)
    if (sanitizedData.registration_no) {
      return NextResponse.json({
        success: false,
        error: 'Registration number cannot be changed'
      }, { status: 400 });
    }

    // Validate email formats if updated
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (sanitizedData.personal_email && !emailPattern.test(sanitizedData.personal_email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid personal email format'
      }, { status: 400 });
    }

    if (sanitizedData.college_email && !emailPattern.test(sanitizedData.college_email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid college email format'
      }, { status: 400 });
    }

    // Validate phone if updated
    if (sanitizedData.contact_no) {
      const phonePattern = /^[0-9]{6,15}$/;
      if (!phonePattern.test(sanitizedData.contact_no)) {
        return NextResponse.json({
          success: false,
          error: 'Phone number must be 6-15 digits'
        }, { status: 400 });
      }
    }

    // Validate student name if updated
    if (sanitizedData.student_name) {
      const namePattern = /^[A-Za-z\s.\-']+$/;
      if (!namePattern.test(sanitizedData.student_name)) {
        return NextResponse.json({
          success: false,
          error: 'Name should only contain letters, spaces, dots, hyphens, and apostrophes'
        }, { status: 400 });
      }
    }

    // Validate session years if updated
    if (sanitizedData.session_from || sanitizedData.session_to) {
      const yearPattern = /^\d{4}$/;
      
      if (sanitizedData.session_from && !yearPattern.test(sanitizedData.session_from)) {
        return NextResponse.json({
          success: false,
          error: 'Session from year must be in YYYY format'
        }, { status: 400 });
      }

      if (sanitizedData.session_to && !yearPattern.test(sanitizedData.session_to)) {
        return NextResponse.json({
          success: false,
          error: 'Session to year must be in YYYY format'
        }, { status: 400 });
      }

      // Validate session range
      const fromYear = sanitizedData.session_from ? parseInt(sanitizedData.session_from) : null;
      const toYear = sanitizedData.session_to ? parseInt(sanitizedData.session_to) : null;

      if (fromYear && toYear && toYear < fromYear) {
        return NextResponse.json({
          success: false,
          error: 'Session to year must be greater than or equal to session from year'
        }, { status: 400 });
      }
    }

    // ==================== UPDATE FORM ====================
    const { error: updateError } = await supabaseAdmin
      .from('no_dues_forms')
      .update(sanitizedData)
      .eq('id', form.id);

    if (updateError) {
      console.error('Error updating form:', updateError);
      throw new Error('Failed to update form');
    }

    // ==================== SUCCESS RESPONSE ====================
    console.log(`✅ Form edited successfully for ${form.registration_no}`);
    
    return NextResponse.json({
      success: true,
      message: 'Form updated successfully',
      data: {
        form_id: form.id,
        registration_no: form.registration_no,
        updated_fields: Object.keys(sanitizedData)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Edit Form API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}