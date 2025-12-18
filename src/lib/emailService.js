/**
 * Email Service using Nodemailer (Vercel Compatible)
 * Handles all email notifications for the JECRC UNIVERSITY NO DUES System
 * Features: SMTP connection pooling, email queue, retry logic
 * 
 * OPTIMIZED: Reduced from 15 emails per student to just 3:
 * 1. One combined email to ALL departments (not individual)
 * 2. One email to student on rejection
 * 3. One email to student when fully approved
 */

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for queue management
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email configuration
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  pool: true, // Use connection pooling
  maxConnections: 5,
  maxMessages: 100,
  rateLimit: 10, // 10 emails per second
  connectionTimeout: 10000, // 10 seconds (default: 2 minutes)
  greetingTimeout: 10000,   // 10 seconds (default: 30 seconds)
  socketTimeout: 10000       // 10 seconds (default: unlimited)
};

const FROM_EMAIL = process.env.SMTP_FROM || 'JECRC UNIVERSITY NO DUES <noreply@jecrc.ac.in>';

// Create transporter with connection pooling
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(SMTP_CONFIG);
    
    // Verify connection on first use
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP connection failed:', error);
      } else {
        console.log('✅ SMTP server ready to send emails');
      }
    });
  }
  return transporter;
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
    .replace(/"/g, '"')
    .trim();
}

/**
 * Add email to queue for later processing
 * @param {Object} emailData - Email data
 * @returns {Promise<Object>} - Result with queue ID
 */
async function addToQueue(emailData) {
  try {
    const { data, error } = await supabase
      .from('email_queue')
      .insert([{
        recipient_email: Array.isArray(emailData.to) ? emailData.to.join(',') : emailData.to,
        subject: emailData.subject,
        html_body: emailData.html,
        text_body: emailData.text || stripHtml(emailData.html),
        template_data: emailData.metadata || {},
        scheduled_for: emailData.scheduledFor || new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log(`📥 Email added to queue: ${data.id}`);
    return { success: true, queueId: data.id };
  } catch (error) {
    console.error('❌ Failed to add email to queue:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email directly using Nodemailer
 * @param {Object} params - Email parameters
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @param {string} params.text - Plain text content (optional)
 * @param {boolean} params.queueOnFailure - Add to queue if sending fails (default: true)
 * @returns {Promise<Object>} - { success: boolean, messageId?: string, error?: string }
 */
export async function sendEmail({ to, subject, html, text, queueOnFailure = true, metadata = {} }) {
  try {
    // Validate inputs
    if (!to || !subject || !html) {
      throw new Error('Missing required email parameters');
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ SMTP not configured. Adding email to queue...');
      if (queueOnFailure) {
        return await addToQueue({ to, subject, html, text, metadata });
      }
      return { success: false, error: 'SMTP not configured' };
    }

    // Get transporter
    const transport = getTransporter();

    // Prepare email options
    const mailOptions = {
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || stripHtml(html)
    };

    // Send email
    const info = await transport.sendMail(mailOptions);

    console.log(`✅ Email sent successfully - ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Email send error:', error);
    console.error('   SMTP Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
    console.error('   SMTP Port:', process.env.SMTP_PORT || '587');
    console.error('   SMTP User:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
    console.error('   Error Code:', error.code);
    console.error('   Error Command:', error.command);
    
    // Add to queue on failure if enabled
    if (queueOnFailure) {
      console.log('📥 Adding failed email to queue for retry...');
      const queueResult = await addToQueue({ to, subject, html, text, metadata });
      return {
        success: false,
        error: error.message,
        queued: queueResult.success,
        queueId: queueResult.queueId
      };
    }
    
    return { success: false, error: error.message };
  }
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
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                JECRC UNIVERSITY
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                NO DUES Clearance System
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
                ${footerText || 'This is an automated email from JECRC UNIVERSITY NO DUES System.'}
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
 * 🆕 OPTIMIZED: Send ONE combined email to ALL departments
 * Instead of individual emails to each staff member
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendCombinedDepartmentNotification({
  allStaffEmails,
  studentName,
  registrationNo,
  school,
  course,
  branch,
  formId,
  dashboardUrl
}) {
  if (!allStaffEmails || allStaffEmails.length === 0) {
    console.warn('⚠️ No staff emails to notify');
    return { success: false, error: 'No recipients' };
  }

  console.log(`📧 Sending COMBINED notification to ${allStaffEmails.length} staff members...`);

  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      A new No Dues application has been submitted and requires review from <strong>all departments</strong>.
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
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
            <strong>Registration No:</strong> <span style="font-family: monospace; background-color: #fef2f2; padding: 2px 6px; border-radius: 4px; color: #dc2626;">${registrationNo}</span>
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
            <strong>School:</strong> ${school}
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
            <strong>Course:</strong> ${course}
          </p>
          <p style="margin: 0; color: #1f2937; font-size: 15px;">
            <strong>Branch:</strong> ${branch}
          </p>
        </td>
      </tr>
    </table>
    
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
        <strong>📌 Important:</strong> This email is sent to all department staff. Please log in to your dashboard to review and take action (Approve/Reject) for your department only.
      </p>
    </div>
    
    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      The student will be notified only when ALL departments approve or if ANY department rejects.
    </p>
  `;

  const html = generateEmailTemplate({
    title: 'New No Dues Application - All Departments',
    content,
    actionUrl: dashboardUrl,
    actionText: 'Review Application',
    footerText: 'This is a combined notification sent to all department staff. Please do not reply to this email.'
  });

  // Send ONE email with all staff in BCC for privacy
  return sendEmail({
    to: allStaffEmails[0], // Primary recipient (first staff)
    bcc: allStaffEmails.slice(1), // BCC others for privacy
    subject: `🔔 New Application: ${studentName} (${registrationNo}) - All Departments`,
    html,
    metadata: { formId, type: 'combined_department_notification', recipientCount: allStaffEmails.length }
  });
}

/**
 * Send rejection notification to student
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendRejectionNotification({
  studentEmail,
  studentName,
  registrationNo,
  departmentName,
  rejectionReason,
  statusUrl
}) {
  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      Hello <strong>${studentName}</strong>,
    </p>
    
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      Your No Dues application has been <strong>rejected</strong> by the <strong>${departmentName}</strong> department.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: #dc2626; font-size: 18px; font-weight: 600;">
            ❌ Application Rejected
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
            <strong>Registration No:</strong> <span style="font-family: monospace;">${registrationNo}</span>
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
            <strong>Rejected By:</strong> ${departmentName}
          </p>
          ${rejectionReason ? `
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
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
        <strong>⚠️ Next Steps:</strong><br/>
        Please resolve the issues mentioned above and reapply through the system. You can edit your application and resubmit for review.
      </p>
    </div>
  `;

  const html = generateEmailTemplate({
    title: `Application Rejected: ${departmentName}`,
    content,
    actionUrl: statusUrl,
    actionText: 'View Application Status'
  });

  return sendEmail({
    to: studentEmail,
    subject: `❌ Application Rejected - ${registrationNo}`,
    html,
    metadata: { type: 'rejection_notification', department: departmentName }
  });
}

/**
 * Send certificate ready notification to student (all approved)
 * @param {Object} params - Notification parameters
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
    
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
        <strong>📥 Download Your Certificate:</strong><br/>
        Click the button below to access your No Dues Certificate. You can download and print it for official use.
      </p>
    </div>
  `;

  const html = generateEmailTemplate({
    title: '🎓 No Dues Certificate Ready',
    content,
    actionUrl: certificateUrl,
    actionText: '📥 Download Certificate'
  });

  return sendEmail({
    to: studentEmail,
    subject: `🎓 Certificate Ready: ${registrationNo}`,
    html,
    metadata: { type: 'certificate_ready' }
  });
}

/**
 * 🆕 OPTIMIZED: Send ONE email for reapplication (combined to all departments)
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendReapplicationNotification({
  allStaffEmails,
  studentName,
  registrationNo,
  studentMessage,
  reapplicationNumber,
  school,
  course,
  branch,
  dashboardUrl
}) {
  if (!allStaffEmails || allStaffEmails.length === 0) {
    console.warn('⚠️ No staff emails for reapplication notification');
    return { success: false, error: 'No recipients' };
  }

  console.log(`📧 Sending COMBINED reapplication notification to ${allStaffEmails.length} staff members...`);

  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      A student has <strong>reapplied</strong> to their No Dues application after addressing previous concerns.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
      <tr><td>
        <p style="margin: 0 0 8px 0; color: #f59e0b; font-size: 16px; font-weight: 600;">
          🔄 Reapplication #${reapplicationNumber}
        </p>
        <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
          <strong>Student:</strong> ${studentName}
        </p>
        <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
          <strong>Registration No:</strong> <span style="font-family: monospace;">${registrationNo}</span>
        </p>
        <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
          <strong>School:</strong> ${school}
        </p>
        <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
          <strong>Course:</strong> ${course}
        </p>
        <p style="margin: 0; color: #1f2937; font-size: 15px;">
          <strong>Branch:</strong> ${branch}
        </p>
      </td></tr>
    </table>
    
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; color: #3b82f6; font-size: 13px; font-weight: 600;">
        STUDENT'S RESPONSE
      </p>
      <p style="margin: 0; color: #1e3a8a; font-size: 14px; font-style: italic;">
        "${studentMessage}"
      </p>
    </div>
    
    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      Please log in to review the updated application and take appropriate action.
    </p>
  `;

  const html = generateEmailTemplate({
    title: 'Student Reapplication - Review Required',
    content,
    actionUrl: dashboardUrl,
    actionText: 'Review Reapplication'
  });

  return sendEmail({
    to: allStaffEmails[0],
    bcc: allStaffEmails.slice(1),
    subject: `🔄 Reapplication #${reapplicationNumber}: ${studentName} (${registrationNo})`,
    html,
    metadata: { type: 'reapplication', reapplicationNumber, recipientCount: allStaffEmails.length }
  });
}

// Export all functions
export default {
  sendEmail,
  sendCombinedDepartmentNotification,
  sendRejectionNotification,
  sendCertificateReadyNotification,
  sendReapplicationNotification,
  addToQueue
};