// Daily Reminder System - Simple self-scheduling approach
// Sends reminder emails at 4 PM IST daily

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Get pending applications count for a staff member
 */
async function getPendingCount(staffEmail) {
  try {
    // Get staff profile to check role and scope
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school, course, branch')
      .eq('email', staffEmail)
      .single();

    if (!profile) return 0;

    // Build query based on role
    let query = supabase
      .from('student_applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Apply scope filtering for HOD
    if (profile.role === 'hod') {
      const filters = [];
      
      if (profile.school && profile.school.length > 0) {
        filters.push(supabase
          .from('student_applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .in('school', profile.school));
      }
      
      if (profile.course && profile.course.length > 0) {
        filters.push(supabase
          .from('student_applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .in('course', profile.course));
      }
      
      if (profile.branch && profile.branch.length > 0) {
        filters.push(supabase
          .from('student_applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .in('branch', profile.branch));
      }

      if (filters.length > 0) {
        const counts = await Promise.all(filters);
        return counts.reduce((sum, { count }) => sum + (count || 0), 0);
      }
    }

    const { count } = await query;
    return count || 0;
  } catch (error) {
    console.error(`Error getting pending count for ${staffEmail}:`, error);
    return 0;
  }
}

/**
 * Generate simple reminder email HTML
 */
function generateReminderHTML(staffName, pendingCount, dashboardUrl) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Reminder - Pending Applications</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Daily Reminder</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">JECRC No Dues System</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; margin: 0 0 20px 0;">
                Hello <strong>${staffName}</strong>,
              </p>

              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
                This is your daily reminder about pending applications in your dashboard.
              </p>

              <!-- Stats Box -->
              <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 0 0 30px 0; border-radius: 4px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 10px 0;">
                      <h2 style="color: #667eea; font-size: 36px; margin: 0; font-weight: bold;">${pendingCount}</h2>
                      <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">
                        ${pendingCount === 1 ? 'Application' : 'Applications'} Pending Review
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              ${pendingCount > 0 ? `
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
                Please review and take action on these applications at your earliest convenience.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              ` : `
              <p style="color: #10b981; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
                ✓ Great job! All applications have been reviewed.
              </p>
              `}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                This is an automated daily reminder from JECRC No Dues System.<br>
                You are receiving this because you are registered as staff.<br>
                Time: 4:00 PM IST
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
 * Generate plain text version
 */
function generateReminderText(staffName, pendingCount, dashboardUrl) {
  return `
Daily Reminder - JECRC No Dues System

Hello ${staffName},

This is your daily reminder about pending applications in your dashboard.

PENDING APPLICATIONS: ${pendingCount}

${pendingCount > 0 
  ? `Please review and take action on these applications at your earliest convenience.\n\nGo to Dashboard: ${dashboardUrl}` 
  : 'Great job! All applications have been reviewed.'}

---
This is an automated daily reminder sent at 4:00 PM IST.
JECRC No Dues System
  `.trim();
}

/**
 * Send reminder to a single staff member
 */
async function sendReminderToStaff(staffEmail, staffName) {
  try {
    const pendingCount = await getPendingCount(staffEmail);
    const dashboardUrl = 'https://nodues.jecrcuniversity.edu.in/staff/dashboard';

    const mailOptions = {
      from: `"JECRC No Dues System" <${process.env.SMTP_USER}>`,
      to: staffEmail,
      subject: `Daily Reminder: ${pendingCount} Pending ${pendingCount === 1 ? 'Application' : 'Applications'}`,
      html: generateReminderHTML(staffName, pendingCount, dashboardUrl),
      text: generateReminderText(staffName, pendingCount, dashboardUrl),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Reminder sent to ${staffEmail} (${pendingCount} pending)`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to send reminder to ${staffEmail}:`, error);
    return false;
  }
}

/**
 * Send reminders to all staff members
 */
export async function sendDailyReminders() {
  try {
    console.log('Starting daily reminder process...');

    // Get all staff members
    const { data: staff, error } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('role', ['staff', 'hod']);

    if (error) {
      console.error('Error fetching staff:', error);
      return { success: false, error: error.message };
    }

    if (!staff || staff.length === 0) {
      console.log('No staff members found');
      return { success: true, sent: 0, failed: 0 };
    }

    console.log(`Found ${staff.length} staff members`);

    // Send reminders
    const results = await Promise.allSettled(
      staff.map(member => sendReminderToStaff(member.email, member.full_name))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.filter(r => r.status === 'rejected' || r.value === false).length;

    console.log(`Daily reminders completed: ${sent} sent, ${failed} failed`);

    return { success: true, sent, failed, total: staff.length };
  } catch (error) {
    console.error('Error in sendDailyReminders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Schedule next reminder check
 * This function will be called on every API request to check if it's time to send reminders
 */
export function shouldSendReminder() {
  const now = new Date();
  
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  const hour = istTime.getUTCHours();
  const minute = istTime.getUTCMinutes();
  
  // Check if it's 4 PM IST (16:00)
  return hour === 16 && minute < 5; // 5-minute window
}

/**
 * Check and send reminder if needed
 * This will be called from middleware or API routes
 */
export async function checkAndSendReminder() {
  if (!shouldSendReminder()) {
    return { skipped: true, reason: 'Not reminder time' };
  }

  // Check if reminder was already sent today
  const today = new Date().toISOString().split('T')[0];
  const lastSentKey = 'last_reminder_sent';
  
  try {
    // Try to get from database or cache
    const { data: setting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', lastSentKey)
      .single();

    if (setting && setting.value === today) {
      return { skipped: true, reason: 'Already sent today' };
    }

    // Send reminders
    const result = await sendDailyReminders();

    // Update last sent date
    await supabase
      .from('settings')
      .upsert({ key: lastSentKey, value: today }, { onConflict: 'key' });

    return result;
  } catch (error) {
    console.error('Error in checkAndSendReminder:', error);
    return { success: false, error: error.message };
  }
}