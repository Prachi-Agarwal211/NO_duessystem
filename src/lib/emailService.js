/**
 * Email Service using Nodemailer (Vercel Compatible)
 * Handles all email notifications for the JECRC UNIVERSITY NO DUES System
 * Features: SMTP connection pooling, email queue, retry logic
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
  rateLimit: 10 // 10 emails per second
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
        to_address: Array.isArray(emailData.to) ? emailData.to.join(',') : emailData.to,
        subject: emailData.subject,
        html_content: emailData.html,
        text_content: emailData.text || stripHtml(emailData.html),
        metadata: emailData.metadata || {},
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
 * Send email with automatic retry logic
 * @param {Object} params - Email parameters
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<Object>} - Send result
 */
export async function sendEmailWithRetry(params, maxRetries = 3) {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt++;
    console.log(`📤 Email send attempt ${attempt}/${maxRetries}...`);
    
    const result = await sendEmail({ ...params, queueOnFailure: false });
    
    if (result.success) {
      if (attempt > 1) {
        console.log(`✅ Email sent successfully after ${attempt} attempts`);
      }
      return result;
    }
    
    lastError = result.error;
    
    // Exponential backoff before retry
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed - add to queue
  console.log(`❌ All ${maxRetries} attempts failed. Adding to queue...`);
  return await addToQueue(params);
}

/**
 * Send bulk emails in batches
 * Compatible with Vercel's function timeout limits
 * @param {Array} emails - Array of email objects
 * @param {number} batchSize - Emails per batch (default: 10)
 * @param {number} timeout - Max processing time in ms (default: 45000)
 * @returns {Promise<Object>} - Results and statistics
 */
export async function sendBulkEmails(emails, batchSize = 10, timeout = 45000) {
  const startTime = Date.now();
  const results = {
    sent: 0,
    queued: 0,
    failed: 0,
    details: []
  };

  for (let i = 0; i < emails.length; i += batchSize) {
    // Check timeout to avoid Vercel function limit
    if (Date.now() - startTime > timeout) {
      console.log(`⏰ Approaching timeout. Queueing remaining ${emails.length - i} emails...`);
      
      // Queue remaining emails
      const remaining = emails.slice(i);
      for (const email of remaining) {
        const queueResult = await addToQueue(email);
        if (queueResult.success) {
          results.queued++;
        } else {
          results.failed++;
        }
      }
      break;
    }

    // Process current batch
    const batch = emails.slice(i, i + batchSize);
    console.log(`📧 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} emails)...`);
    
    const batchResults = await Promise.all(
      batch.map(email => sendEmail(email))
    );
    
    // Count results
    batchResults.forEach((result, index) => {
      if (result.success) {
        results.sent++;
      } else if (result.queued) {
        results.queued++;
      } else {
        results.failed++;
      }
      results.details.push({
        email: batch[index].to,
        ...result
      });
    });
  }

  console.log(`\n📊 Bulk email results: ${results.sent} sent, ${results.queued} queued, ${results.failed} failed`);
  return results;
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
 * Send notification to department when new form is submitted
 * @param {Object} params - Notification parameters
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
    html,
    metadata: { formId, type: 'department_notification' }
  });
}

/**
 * Send notification to all staff members
 * Uses parallel sending with queue fallback for Vercel compatibility
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} - Results summary
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
    return { sent: 0, queued: 0, failed: 0 };
  }

  console.log(`📧 Sending notifications to ${staffMembers.length} staff member(s)...`);

  // Prepare all emails
  const emails = staffMembers.map(staff => ({
    to: staff.email,
    subject: `New Application: ${studentName} (${registrationNo})`,
    html: generateEmailTemplate({
      title: 'New No Dues Application',
      content: `
        <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
          A new No Dues application has been submitted to the <strong>${staff.department}</strong> department.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <tr><td>
            <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
              <strong>Name:</strong> ${studentName}
            </p>
            <p style="margin: 0; color: #1f2937; font-size: 15px;">
              <strong>Registration No:</strong> <span style="font-family: monospace; background-color: #fef2f2; padding: 2px 6px; border-radius: 4px; color: #dc2626;">${registrationNo}</span>
            </p>
          </td></tr>
        </table>
      `,
      actionUrl: dashboardUrl,
      actionText: 'Review Application'
    }),
    metadata: { formId, type: 'department_notification', department: staff.department }
  }));

  // Send in batches with automatic queueing
  const results = await sendBulkEmails(emails, 10, 45000);
  
  console.log(`\n✅ Department notifications: ${results.sent} sent, ${results.queued} queued, ${results.failed} failed`);
  return results;
}

/**
 * Send status update notification to student
 * @param {Object} params - Notification parameters
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
  `;

  const html = generateEmailTemplate({
    title: `${actionText}: ${departmentName} Department`,
    content,
    actionUrl: statusUrl,
    actionText: 'Check Application Status'
  });

  return sendEmail({
    to: studentEmail,
    subject: `${emoji} ${departmentName} - Application ${actionText}`,
    html,
    metadata: { type: 'status_update', action, department: departmentName }
  });
}

/**
 * Send certificate ready notification to student
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
 * Send reapplication notification to staff members
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} - Results summary
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
    return { sent: 0, queued: 0, failed: 0 };
  }

  console.log(`📧 Sending reapplication notifications to ${staffMembers.length} staff member(s)...`);

  const emails = staffMembers.map(staff => ({
    to: staff.email,
    subject: `🔄 Reapplication: ${studentName} (${registrationNo}) - Review #${reapplicationNumber}`,
    html: generateEmailTemplate({
      title: 'Student Reapplication - Review Required',
      content: `
        <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
          A student has <strong>reapplied</strong> to their No Dues application.
        </p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
          <tr><td>
            <p style="margin: 0 0 8px 0; color: #f59e0b; font-size: 16px; font-weight: 600;">
              🔄 Reapplication #${reapplicationNumber}
            </p>
            <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
              <strong>Student:</strong> ${studentName}
            </p>
            <p style="margin: 0; color: #1f2937; font-size: 15px;">
              <strong>Registration No:</strong> <span style="font-family: monospace;">${registrationNo}</span>
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
      `,
      actionUrl: formUrl || dashboardUrl,
      actionText: 'Review Reapplication'
    }),
    metadata: { type: 'reapplication', reapplicationNumber, department: staff.department }
  }));

  const results = await sendBulkEmails(emails, 10, 45000);
  
  console.log(`\n✅ Reapplication notifications: ${results.sent} sent, ${results.queued} queued`);
  return results;
}

// Export all functions as default for compatibility
export default {
  sendEmail,
  sendEmailWithRetry,
  sendBulkEmails,
  sendDepartmentNotification,
  notifyAllDepartments,
  sendStatusUpdateToStudent,
  sendCertificateReadyNotification,
  sendReapplicationNotifications,
  addToQueue
};