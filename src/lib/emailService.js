/**
 * Email Service using Nodemailer
 * Handles all email notifications for the JECRC UNIVERSITY NO DUES System
 * 
 * Features:
 * - SMTP connection pooling
 * - Inline retry with exponential backoff (no cron dependency)
 * - Graceful failure handling
 * 
 * OPTIMIZED: Reduced from 15 emails per student to just 3:
 * 1. One combined email to ALL departments (not individual)
 * 2. One email to student on rejection
 * 3. One email to student when fully approved
 */

import nodemailer from 'nodemailer';

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
  maxConnections: 3, // Reduced for stability
  maxMessages: 50,
  connectionTimeout: 15000, // 15 seconds
  greetingTimeout: 15000,
  socketTimeout: 15000
};

const FROM_EMAIL = process.env.SMTP_FROM || 'JECRC UNIVERSITY NO DUES <noreply@jecrcuniversity.edu.in>';

// Transporter with lazy initialization and health tracking
let transporter = null;
let transporterCreatedAt = 0;
const TRANSPORTER_MAX_AGE = 10 * 60 * 1000; // Recreate transporter every 10 minutes

/**
 * Get or create SMTP transporter with connection health management
 */
async function getTransporter() {
  const now = Date.now();

  // Recreate transporter if too old or doesn't exist
  if (!transporter || (now - transporterCreatedAt > TRANSPORTER_MAX_AGE)) {
    if (transporter) {
      try {
        transporter.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    transporter = nodemailer.createTransport(SMTP_CONFIG);
    transporterCreatedAt = now;

    // Verify connection (async, but we don't wait)
    transporter.verify()
      .then(() => console.log('✅ SMTP connection verified'))
      .catch(err => console.warn('⚠️ SMTP verification failed:', err.message));
  }

  return transporter;
}

/**
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send email with inline retry logic
 * Attempts up to 3 times with exponential backoff: 1s, 2s, 4s
 */
async function sendWithRetry(mailOptions, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const transport = await getTransporter();
      const info = await transport.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Email attempt ${attempt}/${maxRetries} failed:`, error.message);

      // If transporter error, recreate it
      if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
        transporter = null;
      }

      // Don't retry on final attempt
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  return { success: false, error: lastError?.message || 'Max retries exceeded' };
}

/**
 * Send email directly using Nodemailer with retry logic
 * @param {Object} params - Email parameters
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string|string[]} params.cc - CC recipient email(s) (optional)
 * @param {string|string[]} params.bcc - BCC recipient email(s) (optional)
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @param {string} params.text - Plain text content (optional)
 * @returns {Promise<Object>} - { success: boolean, messageId?: string, error?: string }
 */
export async function sendEmail({ to, cc, bcc, subject, html, text, metadata = {} }) {
  // Validate inputs
  if (!to || !subject || !html) {
    console.error('❌ Missing required email parameters');
    return { success: false, error: 'Missing required email parameters' };
  }

  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP not configured. SMTP_USER and SMTP_PASS are required.');
    return { success: false, error: 'SMTP not configured' };
  }

  // Prepare email options
  const mailOptions = {
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text: text || stripHtml(html)
  };

  // Add CC if provided
  if (cc) {
    mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
  }

  // Add BCC if provided
  if (bcc) {
    mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
  }

  // Send with inline retry logic
  const result = await sendWithRetry(mailOptions, 3);

  if (result.success) {
    console.log(`✅ Email sent successfully - ID: ${result.messageId}`);
    console.log(`   TO: ${mailOptions.to}`);
    if (cc) console.log(`   CC: ${mailOptions.cc}`);
    if (bcc) console.log(`   BCC: ${mailOptions.bcc}`);
  } else {
    console.error(`❌ Email failed after retries: ${result.error}`);
    console.error('   SMTP Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
    console.error('   SMTP User:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
  }

  return result;
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

  // Send ONE email with all staff in CC (visible to all)
  return sendEmail({
    to: allStaffEmails[0], // Primary recipient (first staff)
    cc: allStaffEmails.slice(1), // CC all others (visible to everyone)
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
    cc: allStaffEmails.slice(1), // CC all others (visible to everyone)
    subject: `🔄 Reapplication #${reapplicationNumber}: ${studentName} (${registrationNo})`,
    html,
    metadata: { type: 'reapplication', reapplicationNumber, recipientCount: allStaffEmails.length }
  });
}

/**
 * Send support ticket response to user
 * @param {Object} params - Response parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendSupportTicketResponse({
  userEmail,
  ticketNumber,
  subject,
  adminResponse,
  status,
  resolvedBy
}) {
  const statusMessages = {
    'resolved': 'Your ticket has been resolved.',
    'closed': 'Your ticket has been closed.',
    'in_progress': 'Your ticket is being worked on.'
  };

  const content = `
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 40px; margin-bottom: 10px;">💬</div>
      <h2 style="color: white; margin: 0; font-size: 22px;">Support Update</h2>
    </div>
    
    <p style="color: #374151; line-height: 1.8; font-size: 15px;">
      Hello,<br><br>
      ${statusMessages[status] || 'There is an update on your support ticket.'}
    </p>
    
    <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #C41E3A;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">Ticket #${ticketNumber}</p>
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Subject: ${subject}</p>
    </div>
    
    ${adminResponse ? `
    <div style="background: #ffffff; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <p style="font-weight: 600; color: #1f2937; margin: 0 0 12px 0;">📝 Response from Support Team:</p>
      <p style="color: #374151; line-height: 1.8; margin: 0; white-space: pre-wrap;">${adminResponse}</p>
    </div>
    ` : ''}
    
    <p style="color: #6b7280; font-size: 13px; margin-top: 25px;">
      If you have further questions, please submit a new support request.
    </p>
  `;

  const html = generateEmailTemplate({
    title: `Ticket Update: ${ticketNumber}`,
    content,
    actionUrl: 'https://nodues.jecrcuniversity.edu.in/student/check-status',
    actionText: 'Check Your Status',
    footerText: `Resolved by: ${resolvedBy || 'Support Team'}`
  });

  return sendEmail({
    to: userEmail,
    subject: `[Ticket ${ticketNumber}] ${statusMessages[status] || 'Update'} - ${subject}`,
    html,
    metadata: { type: 'support_response', ticketNumber, status }
  });
}

/**
 * Send gentle reminder to department staff about pending applications
 * @param {Object} params - Reminder parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendDepartmentReminder({
  staffEmails,
  studentName,
  registrationNo,
  departmentName,
  daysPending,
  customMessage,
  dashboardUrl
}) {
  const urgencyLevel = daysPending >= 7 ? 'high' : daysPending >= 3 ? 'medium' : 'low';
  const urgencyColors = {
    high: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
    medium: { bg: '#fffbeb', border: '#f59e0b', text: '#d97706' },
    low: { bg: '#f0fdf4', border: '#22c55e', text: '#16a34a' }
  };
  const colors = urgencyColors[urgencyLevel];

  const content = `
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 40px; margin-bottom: 10px;">⏰</div>
      <h2 style="color: white; margin: 0; font-size: 22px;">Gentle Reminder</h2>
    </div>
    
    <p style="color: #374151; line-height: 1.8; font-size: 15px;">
      Hello ${departmentName} Team,<br><br>
      This is a friendly reminder about a pending no-dues application that requires your attention.
    </p>
    
    <div style="background: ${colors.bg}; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid ${colors.border};">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">📋 Student: ${studentName}</p>
      <p style="margin: 0 0 8px 0; color: #6b7280;">Registration No: ${registrationNo}</p>
      <p style="margin: 0; color: ${colors.text}; font-weight: 600;">
        ⏱️ Pending for: ${daysPending} day${daysPending !== 1 ? 's' : ''}
      </p>
    </div>
    
    ${customMessage ? `
    <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #374151; font-style: italic;">"${customMessage}"</p>
      <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 12px;">— Registration Office</p>
    </div>
    ` : ''}
    
    <p style="color: #374151; line-height: 1.8; margin: 20px 0;">
      Please review this application at your earliest convenience. Timely processing helps students complete their clearance smoothly.
    </p>
  `;

  const html = generateEmailTemplate({
    title: 'Pending Application Reminder',
    content,
    actionUrl: dashboardUrl || 'https://nodues.jecrcuniversity.edu.in/staff/dashboard',
    actionText: 'Review Application',
    footerText: 'This is an automated reminder from the Registration Office.'
  });

  return sendEmail({
    to: staffEmails[0],
    cc: staffEmails.slice(1),
    subject: `⏰ Reminder: ${studentName} (${registrationNo}) - Pending ${daysPending} days`,
    html,
    metadata: { type: 'department_reminder', departmentName, daysPending, registrationNo }
  });
}

/**
 * 🆕 OPTIMIZED: Send a DAILY SUMMARY of all pending applications to each department
 * This replaces high-frequency immediate emails. Triggered lazily @ 3:00 PM.
 * @param {Object} params - Digest parameters
 * @returns {Promise<Object>} - Digest result
 */
export async function sendDailyDepartmentDigest({
  pendingApplications, // Array of applications grouped by department
  allStaff,            // Array of staff profiles
  dashboardUrl
}) {
  if (!pendingApplications || pendingApplications.length === 0) {
    console.log('📝 No pending applications for today\'s digest.');
    return { success: true, skipped: true };
  }

  console.log(`📧 Preparing Daily Digest for ${pendingApplications.length} pending items...`);

  // Group staff by department for CCing correctly
  const staffByDept = allStaff.reduce((acc, staff) => {
    const dept = staff.department_name;
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(staff.email);
    return acc;
  }, {});

  // Group applications by department
  const appsByDept = pendingApplications.reduce((acc, app) => {
    const dept = app.department_name;
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(app);
    return acc;
  }, {});

  const results = [];

  for (const deptName of Object.keys(appsByDept)) {
    const deptApps = appsByDept[deptName];
    const deptEmails = staffByDept[deptName] || [];

    if (deptEmails.length === 0) continue;

    const deptDisplayName = (deptName === 'school_hod' ? 'Academic (HOD)' : deptName).replace(/_/g, ' ').toUpperCase();

    // Create HTML Table for applications
    const tableRows = deptApps.map(app => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; font-size: 14px; color: #1f2937;">${app.no_dues_forms.student_name}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #1f2937; font-family: monospace;">${app.no_dues_forms.registration_no}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #6b7280;">${app.no_dues_forms.course}</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #6b7280;">${new Date(app.no_dues_forms.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');

    const content = `
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hello <strong>${deptDisplayName}</strong> Team,
      </p>
      
      <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        This is your daily summary of <strong>pending No Dues applications</strong> requiring your department's review as of 3:00 PM today.
      </p>
      
      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead style="background-color: #f9fafb;">
            <tr>
              <th align="left" style="padding: 12px 8px; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Student Name</th>
              <th align="left" style="padding: 12px 8px; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Reg No</th>
              <th align="left" style="padding: 12px 8px; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Course</th>
              <th align="left" style="padding: 12px 8px; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Submitted</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
      
      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>⚡ Action Required:</strong> Please log in to your dashboard to process these applications. 
          Prompt approval helps ensure students receive their certificates on time.
        </p>
      </div>
    `;

    const html = generateEmailTemplate({
      title: 'Daily Department Digest',
      content,
      actionUrl: dashboardUrl,
      actionText: 'Go to Dashboard',
      footerText: `This is a daily summary sent to the ${deptDisplayName} department. Total pending: ${deptApps.length}`
    });

    const result = await sendEmail({
      to: deptEmails[0],
      cc: deptEmails.slice(1),
      subject: `📋 Daily Digest: ${deptApps.length} Pending Applications - ${deptDisplayName}`,
      html
    });

    results.push({ dept: deptName, success: result.success });
  }

  return {
    success: results.every(r => r.success),
    summary: results,
    totalSent: results.filter(r => r.success).length
  };
}

// Export all functions
export default {
  sendEmail,
  sendCombinedDepartmentNotification,
  sendDailyDepartmentDigest,
  sendRejectionNotification,
  sendCertificateReadyNotification,
  sendReapplicationNotification,
  sendSupportTicketResponse,
  sendDepartmentReminder
};