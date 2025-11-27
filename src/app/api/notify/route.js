import { NextResponse } from "next/server";
import { sendDepartmentNotification } from '@/lib/emailService';

/**
 * POST /api/notify
 * Send email notification to a specific department about a new form submission
 * 
 * This route is called per-department to send individual notifications
 * For bulk notifications, use the emailService directly
 */

// Department email mapping
const DEPARTMENT_EMAILS = {
  'School (HOD/Department)': process.env.SCHOOL_HOD_EMAIL || 'hod@jecrc.ac.in',
  'Library': process.env.LIBRARY_EMAIL || 'library@jecrc.ac.in',
  'IT Department': process.env.IT_DEPARTMENT_EMAIL || 'it@jecrc.ac.in',
  'Hostel': process.env.HOSTEL_EMAIL || 'hostel@jecrc.ac.in',
  'Mess': process.env.MESS_EMAIL || 'mess@jecrc.ac.in',
  'Canteen': process.env.CANTEEN_EMAIL || 'canteen@jecrc.ac.in',
  'TPO': process.env.TPO_EMAIL || 'tpo@jecrc.ac.in',
  'Alumni Association': process.env.ALUMNI_EMAIL || 'alumni@jecrc.ac.in',
  'Accounts Department': process.env.ACCOUNTS_EMAIL || 'accounts@jecrc.ac.in',
  'Security': process.env.SECURITY_EMAIL || 'security@jecrc.ac.in',
  'IT & Infrastructure': process.env.IT_EMAIL || 'it@jecrc.ac.in',
  'Other Departments': process.env.OTHER_DEPT_EMAIL || 'admin@jecrc.ac.in'
};

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

    // Get the target email for the department
    const toEmail = DEPARTMENT_EMAILS[department];
    if (!toEmail) {
      return createErrorResponse(
        `No email configured for department: ${department}`,
        400,
        'email-config'
      );
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
