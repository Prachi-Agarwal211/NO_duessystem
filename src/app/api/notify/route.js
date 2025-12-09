import { NextResponse } from "next/server";
import { sendDepartmentNotification } from '@/lib/emailService';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/notify
 * Send email notification to staff based on department
 * CLEANED UP - Removed hardcoded fallback emails
 * Now uses staff accounts from database (primary) with NO fallbacks
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get staff email for department from database
 */
async function getStaffEmailForDepartment(departmentName) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('department', departmentName)
      .eq('role', 'staff')
      .single();
    
    if (error || !data) {
      console.warn(`No staff account found for department: ${departmentName}`);
      return null;
    }
    
    return data.email;
  } catch (err) {
    console.error('Error fetching staff email:', err);
    return null;
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
      department = "",
      form_id,
    } = body || {};

    // ==================== VALIDATION ====================

    if (!form_id) {
      return createErrorResponse("Form ID is required", 400, 'validation');
    }

    if (!student_name || !registration_no) {
      return createErrorResponse("Student name and registration number are required", 400, 'validation');
    }

    if (!department) {
      return createErrorResponse("Department is required", 400, 'validation');
    }

    // Get staff email from database
    const toEmail = await getStaffEmailForDepartment(department);
    
    if (!toEmail) {
      console.warn(`No staff email found for ${department}, skipping notification`);
      return NextResponse.json({
        success: true,
        message: "No staff assigned to this department yet",
        department,
        skipped: true,
        timestamp: new Date().toISOString()
      });
    }

    // ==================== SEND EMAIL ====================

    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/staff/dashboard`;

    try {
      const result = await sendDepartmentNotification({
        departmentEmail: toEmail,
        studentName: escapeHtml(student_name),
        registrationNo: escapeHtml(registration_no),
        formId: form_id,
        dashboardUrl
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
        message: "Notification sent successfully",
        department,
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
