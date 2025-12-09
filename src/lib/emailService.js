/**
 * Email Service using Resend
 * Handles all email notifications for the No Dues System
 * KISS Principle: Simple, focused email notifications
 */

import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
// Use Resend's default sender for testing, or custom verified domain in production
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'JECRC No Dues <onboarding@resend.dev>';
const REPLY_TO = process.env.RESEND_REPLY_TO || 'onboarding@resend.dev';

/**
 * Send email using Resend
 * @param {Object} params - Email parameters
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @param {string} params.text - Plain text content (optional)
 * @returns {Promise<Object>} - { success: boolean, id?: string, error?: string }
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    // Validate inputs
    if (!to || !subject || !html) {
      throw new Error('Missing required email parameters');
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured. Email not sent.');
      console.log(`📧 Mock Email - To: ${to}, Subject: ${subject}`);
      return { success: false, error: 'Resend API key not configured' };
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || stripHtml(html),
      reply_to: REPLY_TO,
    });

    if (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Email sent successfully - ID: ${data.id}`);
    return { success: true, id: data.id };

  } catch (error) {
    console.error('❌ Email service error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Strip HTML tags for plain text fallback
 * @param {string} html - HTML content
 * @returns {string} - Plain text
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .trim();
}

/**
 * Generate HTML email template
 * @param {Object} params - Template parameters
 * @returns {string} - HTML content
 */
function generateEmailTemplate({ title, content, actionUrl, actionText, footerText }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
              <!-- JECRC Logo -->
              <img src="https://jecrc.ac.in/wp-content/uploads/2023/06/logo-1.png" alt="JECRC University" style="height: 60px; width: auto; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;" />
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                JECRC University
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                No Dues Clearance System
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 600;">
                ${title}
              </h2>
              ${content}
              
              ${actionUrl && actionText ? `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                  <tr>
                    <td align="center">
                      <a href="${actionUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        ${actionText}
                      </a>
                    </td>
                  </tr>
                </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                ${footerText || 'This is an automated email from JECRC No Dues System.'}
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
                © ${new Date().getFullYear()} JECRC University. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send notification to department when new form is submitted
 * @param {Object} params - Notification parameters
 * @param {string} params.departmentEmail - Department email address
 * @param {string} params.studentName - Student name
 * @param {string} params.registrationNo - Registration number
 * @param {string} params.formId - Form UUID
 * @param {string} params.dashboardUrl - URL to department dashboard
 * @returns {Promise<Object>} - Email send result
 */
export async function sendDepartmentNotification({
  departmentEmail,
  studentName,
  registrationNo,
  formId,
  dashboardUrl
}) {
  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      A new No Dues application has been submitted and requires your attention.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">
            Student Details
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
            <strong>Name:</strong> ${studentName}
          </p>
          <p style="margin: 0; color: #1f2937; font-size: 15px;">
            <strong>Registration No:</strong> <span style="font-family: monospace; background-color: #fef2f2; padding: 2px 6px; border-radius: 4px; color: #dc2626;">${registrationNo}</span>
          </p>
        </td>
      </tr>
    </table>
    
    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      Please review the application and take appropriate action (Approve/Reject) from your dashboard.
    </p>
  `;

  const html = generateEmailTemplate({
    title: 'New No Dues Application',
    content,
    actionUrl: dashboardUrl,
    actionText: 'Review Application',
    footerText: 'Please do not reply to this email. For support, contact support@jecrc.ac.in'
  });

  return sendEmail({
    to: departmentEmail,
    subject: `New Application: ${studentName} (${registrationNo})`,
    html
  });
}

/**
 * Send notification to all staff members of specified departments
 * UNIFIED SYSTEM: Uses staff account emails from profiles table
 * @param {Object} params - Notification parameters
 * @param {Array} params.staffMembers - Array of staff objects with email and department info
 * @param {string} params.studentName - Student name
 * @param {string} params.registrationNo - Registration number
 * @param {string} params.formId - Form UUID
 * @param {string} params.dashboardUrl - URL to department dashboard
 * @returns {Promise<Array>} - Array of email send results
 */
export async function notifyAllDepartments({
  staffMembers,
  studentName,
  registrationNo,
  formId,
  dashboardUrl
}) {
  if (!staffMembers || staffMembers.length === 0) {
    console.warn('⚠️ No staff members to notify');
    return [];
  }

  console.log(`📧 Sending notifications to ${staffMembers.length} staff member(s)...`);
  
  const results = await Promise.allSettled(
    staffMembers.map(staff =>
      sendDepartmentNotification({
        departmentEmail: staff.email,
        studentName,
        registrationNo,
        formId,
        dashboardUrl
      })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  console.log(`✅ ${successful}/${staffMembers.length} notifications sent successfully`);

  return results;
}

/**
 * Send status update notification to student
 * @param {Object} params - Notification parameters
 * @param {string} params.studentEmail - Student email (from contact_no or form)
 * @param {string} params.studentName - Student name
 * @param {string} params.registrationNo - Registration number
 * @param {string} params.departmentName - Department that took action
 * @param {string} params.action - 'approved' or 'rejected'
 * @param {string} params.rejectionReason - Reason if rejected (optional)
 * @param {string} params.statusUrl - URL to check status
 * @returns {Promise<Object>} - Email send result
 */
export async function sendStatusUpdateToStudent({
  studentEmail,
  studentName,
  registrationNo,
  departmentName,
  action,
  rejectionReason,
  statusUrl
}) {
  const isApproved = action === 'approved';
  const actionText = isApproved ? 'Approved' : 'Rejected';
  const emoji = isApproved ? '✅' : '❌';

  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      Hello <strong>${studentName}</strong>,
    </p>
    
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      The <strong>${departmentName}</strong> department has <strong>${actionText.toLowerCase()}</strong> your No Dues application.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${isApproved ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px; border-left: 4px solid ${isApproved ? '#16a34a' : '#dc2626'}; padding: 20px; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: ${isApproved ? '#16a34a' : '#dc2626'}; font-size: 18px; font-weight: 600;">
            ${emoji} ${actionText}
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
            <strong>Registration No:</strong> <span style="font-family: monospace;">${registrationNo}</span>
          </p>
          <p style="margin: 0; color: #1f2937; font-size: 14px;">
            <strong>Department:</strong> ${departmentName}
          </p>
          ${!isApproved && rejectionReason ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #fecaca;">
              <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                Reason for Rejection
              </p>
              <p style="margin: 0; color: #dc2626; font-size: 14px; font-style: italic;">
                "${rejectionReason}"
              </p>
            </div>
          ` : ''}
        </td>
      </tr>
    </table>
    
    ${!isApproved ? `
      <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
        Please contact the ${departmentName} department to resolve any outstanding issues.
      </p>
    ` : `
      <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
        You can check the complete status of your application using the button below.
      </p>
    `}
  `;

  const html = generateEmailTemplate({
    title: `${actionText}: ${departmentName} Department`,
    content,
    actionUrl: statusUrl,
    actionText: 'Check Application Status',
    footerText: 'If you have questions, please contact the respective department directly.'
  });

  return sendEmail({
    to: studentEmail,
    subject: `${emoji} ${departmentName} - Application ${actionText}`,
    html
  });
}

/**
 * Send certificate ready notification to student
 * @param {Object} params - Notification parameters
 * @param {string} params.studentEmail - Student email
 * @param {string} params.studentName - Student name
 * @param {string} params.registrationNo - Registration number
 * @param {string} params.certificateUrl - URL to download certificate
 * @returns {Promise<Object>} - Email send result
 */
export async function sendCertificateReadyNotification({
  studentEmail,
  studentName,
  registrationNo,
  certificateUrl
}) {
  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      Congratulations <strong>${studentName}</strong>! 🎉
    </p>
    
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      All departments have approved your No Dues application. Your certificate is now ready for download.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: #16a34a; font-size: 18px; font-weight: 600;">
            ✅ All Departments Approved
          </p>
          <p style="margin: 0; color: #1f2937; font-size: 14px;">
            <strong>Registration No:</strong> <span style="font-family: monospace;">${registrationNo}</span>
          </p>
        </td>
      </tr>
    </table>
    
    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      Click the button below to download your No Dues Certificate. Please keep this certificate safe for your records.
    </p>
  `;

  const html = generateEmailTemplate({
    title: '🎓 No Dues Certificate Ready',
    content,
    actionUrl: certificateUrl,
    actionText: '📥 Download Certificate',
    footerText: 'Congratulations on your successful clearance!'
  });

  return sendEmail({
    to: studentEmail,
    subject: `🎓 Certificate Ready: ${registrationNo}`,
    html
  });
}

/**
 * Send reapplication notification to staff members
 * UNIFIED SYSTEM: Uses staff account emails from profiles table
 * @param {Object} params - Notification parameters
 * @param {Array} params.staffMembers - Array of staff objects with email and department info
 * @param {string} params.studentName - Student name
 * @param {string} params.registrationNo - Registration number
 * @param {string} params.studentMessage - Student's reply message
 * @param {number} params.reapplicationNumber - Reapplication count
 * @param {string} params.dashboardUrl - URL to department dashboard
 * @param {string} params.formUrl - Direct URL to form details
 * @returns {Promise<Array>} - Array of email send results
 */
export async function sendReapplicationNotifications({
  staffMembers,
  studentName,
  registrationNo,
  studentMessage,
  reapplicationNumber,
  dashboardUrl,
  formUrl
}) {
  if (!staffMembers || staffMembers.length === 0) {
    console.warn('⚠️ No staff members to notify for reapplication');
    return [];
  }

  console.log(`📧 Sending reapplication notifications to ${staffMembers.length} staff member(s)...`);
  
  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      A student has <strong>reapplied</strong> to their No Dues application after addressing the rejection reasons.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: #f59e0b; font-size: 16px; font-weight: 600;">
            🔄 Reapplication #${reapplicationNumber}
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
            <strong>Student:</strong> ${studentName}
          </p>
          <p style="margin: 0; color: #1f2937; font-size: 15px;">
            <strong>Registration No:</strong> <span style="font-family: monospace; background-color: #fef2f2; padding: 2px 6px; border-radius: 4px; color: #dc2626;">${registrationNo}</span>
          </p>
        </td>
      </tr>
    </table>
    
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; color: #3b82f6; font-size: 13px; font-weight: 600; text-transform: uppercase;">
        Student's Response
      </p>
      <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6; font-style: italic;">
        "${studentMessage}"
      </p>
    </div>
    
    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      The student has made corrections to their application. Please review the updated information and take appropriate action.
    </p>
  `;

  const html = generateEmailTemplate({
    title: 'Student Reapplication - Review Required',
    content,
    actionUrl: formUrl || dashboardUrl,
    actionText: 'Review Reapplication',
    footerText: 'This is a reapplication. Previous rejection reasons should be addressed.'
  });

  const results = await Promise.allSettled(
    staffMembers.map(staff =>
      sendEmail({
        to: staff.email,
        subject: `🔄 Reapplication: ${studentName} (${registrationNo}) - Review #${reapplicationNumber}`,
        html
      })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  console.log(`✅ ${successful}/${staffMembers.length} reapplication notifications sent successfully`);

  return results;
}

// Export default for compatibility
export default {
  sendEmail,
  sendDepartmentNotification,
  notifyAllDepartments,
  sendStatusUpdateToStudent,
  sendCertificateReadyNotification,
  sendReapplicationNotifications
};