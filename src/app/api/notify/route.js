import { NextResponse } from "next/server";
import { sendCombinedDepartmentNotification } from '@/lib/emailService';
import { createClient } from '@supabase/supabase-js';
import { APP_URLS } from '@/lib/urlHelper';

/**
 * POST /api/notify
 * Send combined email notification to ALL available staff
 * Uses sendCombinedDepartmentNotification to send ONE email with all staff in CC
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all staff emails from database
 */
async function getAllStaffEmails() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, full_name, department_name')
      .eq('role', 'department')
      .not('email', 'is', null);
    
    if (error) {
      console.error('Error fetching staff emails:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Error fetching staff emails:', err);
    return [];
  }
}

/**
 * Create error response helper
 */
function createErrorResponse(message, status = 500, type = 'general') {
  return NextResponse.json({
    success: false,
    error: message,
    type,
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Escape HTML to prevent XSS in emails
 */
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "&#039;");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      student_name = "",
      registration_no = "",
      school = "",
      course = "",
      branch = "",
      form_id,
    } = body || {};

    // ==================== VALIDATION ====================

    if (!form_id) {
      return createErrorResponse("Form ID is required", 400, 'validation');
    }

    if (!student_name || !registration_no) {
      return createErrorResponse("Student name and registration number are required", 400, 'validation');
    }

    // Get all staff emails from database
    const allStaff = await getAllStaffEmails();
    
    if (allStaff.length === 0) {
      console.warn('No staff accounts found in database');
      return NextResponse.json({
        success: true,
        message: "No staff accounts available yet",
        skipped: true,
        timestamp: new Date().toISOString()
      });
    }

    const allStaffEmails = allStaff.map(s => s.email);

    // ==================== SEND COMBINED EMAIL ====================

    try {
      const result = await sendCombinedDepartmentNotification({
        allStaffEmails,
        studentName: escapeHtml(student_name),
        registrationNo: escapeHtml(registration_no),
        school: escapeHtml(school),
        course: escapeHtml(course),
        branch: escapeHtml(branch),
        formId: form_id,
        dashboardUrl: `${APP_URLS.BASE}/staff`
      });

      if (!result.success) {
        return createErrorResponse(
          "Failed to send notification email",
          500,
          'email-send'
        );
      }

      return NextResponse.json({
        success: true,
        message: "Combined notification sent successfully",
        recipientCount: allStaffEmails.length,
        timestamp: new Date().toISOString()
      });

    } catch (emailError) {
      console.error('Email send error:', emailError);
      return createErrorResponse(
        "Failed to send email notification",
        500,
        'email-send'
      );
    }

  } catch (error) {
    console.error('Notify API Error:', error);
    return createErrorResponse(
      "Internal server error",
      500,
      'general'
    );
  }
}
