import { NextResponse } from "next/server";
import { sendDepartmentNotification } from '@/lib/emailService';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      student_name = "",
      registration_no = "",
      contact_no = "",
      department = "Library",
      user_id,
      form_id,
    } = body || {};

    // Validation
    if (!user_id || !form_id) {
      return createErrorResponse("User ID and Form ID are required.", 400, 'validation');
    }

    // Get the target email for the department
    const toEmail = departmentEmails[department];
    if (!toEmail) {
      return createErrorResponse(`No email configured for ${department}`, 400, 'email-config');
    }

    // Generate action URL using centralized JWT service
    const actionUrl = await createActionUrl({ user_id, form_id, department });

    const fromEmail = process.env.RESEND_FROM || "JECRC No Dues <noreply@jecrc.edu.in>";
    const subject = `No Dues Request: ${student_name || "Unknown Student"}`;

    const text = `A student has requested No Dues clearance.\n\nStudent: ${student_name}\nRegistration No: ${registration_no}\nContact No: ${contact_no}\nDepartment: ${department}\n\nPlease review and take action: ${actionUrl.toString()}`;

    const html = `
      <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.6; background-color: #1a1a1a; color: #f0f0f0; padding: 20px; border-radius: 12px; max-width: 600px; margin: auto; border: 1px solid #333;">
        <h2 style="margin:0 0 12px; color: #fff;">No Dues Request Submitted</h2>
        <p style="margin:0 0 16px; color: #ccc;">A student has requested No Dues clearance. Please review and take action using the button below.</p>
        <table style="border-collapse:collapse; width: 100%; border: 1px solid #444; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
          <tbody>
            <tr><td style="padding:8px 12px;color:#aaa; border-bottom: 1px solid #444;">Student</td><td style="padding:8px 12px;font-weight:600; color: #fff; border-bottom: 1px solid #444;">${escapeHtml(student_name)}</td></tr>
            <tr><td style="padding:8px 12px;color:#aaa; border-bottom: 1px solid #444;">Registration No</td><td style="padding:8px 12px; color: #fff; border-bottom: 1px solid #444;">${escapeHtml(registration_no)}</td></tr>
            <tr><td style="padding:8px 12px;color:#aaa; border-bottom: 1px solid #444;">Contact No</td><td style="padding:8px 12px; color: #fff; border-bottom: 1px solid #444;">${escapeHtml(contact_no)}</td></tr>
            <tr><td style="padding:8px 12px;color:#aaa;">Department</td><td style="padding:8px 12px;font-weight:600; color: #fff;">${escapeHtml(department)}</td></tr>
          </tbody>
        </table>
        <a href="${actionUrl.toString()}" style="display: inline-block; background: #b22222; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px;">Review Request</a>
        <p style="margin-top: 16px; font-size: 12px; color: #888;">If the button doesn't work, copy and paste this URL into your browser:<br>${actionUrl.toString()}</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject,
      text,
      html,
    });

    if (result?.error) {
      return createErrorResponse("Failed to send notification email", 500, 'email-send');
    }

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createErrorResponse("Internal server error", 500, 'general');
  }
}

// Small helper to avoid HTML injection in the email body
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
