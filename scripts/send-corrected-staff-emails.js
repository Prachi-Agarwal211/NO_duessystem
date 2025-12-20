/**
 * Send Welcome Emails to Corrected Staff Accounts
 * 
 * This script sends welcome emails to staff with corrected email addresses:
 * - Ashok Singh (Registrar)
 * - Yogesh Joshi (Accounts)
 * 
 * Usage: node scripts/send-corrected-staff-emails.js
 */

require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Corrected staff accounts
const CORRECTED_STAFF = [
  { email: 'ashok.singh@jecrcu.edu.in', name: 'Ashok Singh', department: 'Registrar', type: 'Department Staff' },
  { email: 'yogesh.joshi@jecrcu.edu.in', name: 'Yogesh Joshi', department: 'Accounts', type: 'Department Staff' },
];

// Email template
function getEmailHTML(staff) {
  const loginURL = 'https://nodues.jecrcuniversity.edu.in/staff/login';
  const forgotPasswordURL = 'https://nodues.jecrcuniversity.edu.in/staff/forgot-password';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #C41E3A 0%, #8B1538 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .credentials { background: white; border: 2px solid #C41E3A; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .button { display: inline-block; padding: 12px 30px; background: #C41E3A; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .steps { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .step { margin: 15px 0; padding-left: 30px; position: relative; }
    .step-number { position: absolute; left: 0; top: 0; background: #C41E3A; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; font-size: 14px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    .important { color: #C41E3A; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 JECRC No Dues System</h1>
      <p>Staff Account Activation</p>
    </div>
    
    <div class="content">
      <h2>Dear ${staff.name},</h2>
      
      <p>We are delighted to welcome you to the JECRC No Dues Management System! Your account has been successfully created, and we're excited to have you as part of our digital transformation initiative.</p>
      
      <p>This system will streamline the no dues clearance process for students, and your role as <strong>${staff.type}</strong> in <strong>${staff.department}</strong> is crucial to ensuring a smooth and efficient experience for our students.</p>
      
      <div class="credentials">
        <h3 style="margin-top: 0; color: #C41E3A;">📧 Your Login Credentials</h3>
        <p><strong>Email:</strong> ${staff.email}</p>
        <p><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-size: 16px;">Test@1234</code></p>
        <p><strong>Role:</strong> ${staff.type}</p>
        <p><strong>Department:</strong> ${staff.department}</p>
      </div>
      
      <div class="warning">
        <strong>⚠️ IMPORTANT - Password Change Required:</strong><br>
        For security reasons, you <span class="important">MUST change your password</span> after your first login. The temporary password is shared and must be updated immediately.
      </div>
      
      <div class="steps">
        <h3 style="margin-top: 0; color: #C41E3A;">📝 How to Change Your Password</h3>
        
        <div class="step">
          <span class="step-number">1</span>
          <strong>Visit the Password Reset Page:</strong><br>
          Go to: <a href="${forgotPasswordURL}">${forgotPasswordURL}</a>
        </div>
        
        <div class="step">
          <span class="step-number">2</span>
          <strong>Enter Your Email:</strong><br>
          Enter <code>${staff.email}</code> and click "Send OTP"
        </div>
        
        <div class="step">
          <span class="step-number">3</span>
          <strong>Check Your Email:</strong><br>
          You'll receive a 6-digit OTP code (valid for 10 minutes)
        </div>
        
        <div class="step">
          <span class="step-number">4</span>
          <strong>Enter OTP:</strong><br>
          Enter all 6 digits and click "Verify OTP"
        </div>
        
        <div class="step">
          <span class="step-number">5</span>
          <strong>Set New Password:</strong><br>
          Create a strong password that meets these requirements:
          <ul style="margin-top: 10px;">
            <li>At least 8 characters long</li>
            <li>Contains at least one uppercase letter (A-Z)</li>
            <li>Contains at least one lowercase letter (a-z)</li>
            <li>Contains at least one number (0-9)</li>
          </ul>
        </div>
        
        <div class="step">
          <span class="step-number">6</span>
          <strong>Confirm & Save:</strong><br>
          Re-enter your new password and click "Reset Password"
        </div>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${forgotPasswordURL}" class="button">🔒 Change Password Now</a>
      </div>
      
      <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #1976D2;">💡 Access Your Dashboard:</h4>
        <p>After changing your password, you can access your staff dashboard at:</p>
        <p><a href="${loginURL}" style="color: #C41E3A; font-weight: bold;">${loginURL}</a></p>
        <p style="margin-top: 10px;"><strong>Your dashboard provides:</strong></p>
        <ul style="margin: 5px 0; padding-left: 20px;">
          <li>Real-time view of all pending student applications</li>
          <li>Quick action buttons to approve or reject requests</li>
          <li>Complete student history and clearance records</li>
          <li>Department-specific statistics and insights</li>
          <li>Notification center for important updates</li>
        </ul>
      </div>
      
      <h3 style="color: #C41E3A;">🎯 Your Responsibilities:</h3>
      <ul>
        <li><strong>Review Student Applications:</strong> Check no dues requests assigned to your department</li>
        <li><strong>Approve or Reject:</strong> Take appropriate action on each application with proper comments</li>
        <li><strong>Email Notifications:</strong> You'll receive notifications when new applications are submitted</li>
        <li><strong>Dashboard Access:</strong> View all pending, approved, and rejected applications</li>
      </ul>
      
      <h3 style="color: #C41E3A;">📱 System Features:</h3>
      <ul>
        <li>Real-time application tracking</li>
        <li>Email notifications for new submissions</li>
        <li>Comprehensive dashboard with statistics</li>
        <li>Student history and audit trail</li>
        <li>Mobile-responsive interface</li>
      </ul>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <strong>🔐 Security Tips:</strong>
        <ul style="margin: 10px 0;">
          <li>Never share your password with anyone</li>
          <li>Use a unique password for this system</li>
          <li>Don't use common words or personal information</li>
          <li>Log out when finished using the system</li>
          <li>Report any suspicious activity immediately</li>
        </ul>
      </div>
      
      <h3 style="color: #C41E3A;">📞 Need Help?</h3>
      <p>If you encounter any issues or have questions:</p>
      <ul>
        <li>Contact IT Support: <a href="mailto:seniormanager.it@jecrcu.edu.in">seniormanager.it@jecrcu.edu.in</a></li>
        <li>Visit the Support section in the dashboard after login</li>
      </ul>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
        <p><strong>Quick Links:</strong></p>
        <p>
          🔑 <a href="${forgotPasswordURL}" style="color: #C41E3A;">Change Password</a> | 
          🚀 <a href="${loginURL}" style="color: #C41E3A;">Login Portal</a>
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>JECRC University - No Dues Management System</strong></p>
      <p>This is an automated email. Please do not reply to this message.</p>
      <p style="color: #999; font-size: 11px;">© ${new Date().getFullYear()} JECRC University. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Plain text version
function getEmailText(staff) {
  const loginURL = 'https://nodues.jecrcuniversity.edu.in/staff/login';
  const forgotPasswordURL = 'https://nodues.jecrcuniversity.edu.in/staff/forgot-password';
  
  return `
JECRC No Dues System - Staff Account Activation

Dear ${staff.name},

We are delighted to welcome you to the JECRC No Dues Management System! Your account has been successfully created, and we're excited to have you as part of our digital transformation initiative.

This system will streamline the no dues clearance process for students, and your role as ${staff.type} in ${staff.department} is crucial to ensuring a smooth and efficient experience for our students.

YOUR LOGIN CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${staff.email}
Temporary Password: Test@1234
Role: ${staff.type}
Department: ${staff.department}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANT - PASSWORD CHANGE REQUIRED:
For security reasons, you MUST change your password after your first login. The temporary password is shared and must be updated immediately.

HOW TO CHANGE YOUR PASSWORD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Visit the Password Reset Page:
   ${forgotPasswordURL}

2. Enter Your Email:
   Enter ${staff.email} and click "Send OTP"

3. Check Your Email:
   You'll receive a 6-digit OTP code (valid for 10 minutes)

4. Enter OTP:
   Enter all 6 digits and click "Verify OTP"

5. Set New Password:
   Create a strong password that meets these requirements:
   • At least 8 characters long
   • Contains at least one uppercase letter (A-Z)
   • Contains at least one lowercase letter (a-z)
   • Contains at least one number (0-9)

6. Confirm & Save:
   Re-enter your new password and click "Reset Password"

ACCESS YOUR DASHBOARD:
After changing your password, login to your staff dashboard at:
${loginURL}

Your dashboard provides:
• Real-time view of all pending student applications
• Quick action buttons to approve or reject requests
• Complete student history and clearance records
• Department-specific statistics and insights
• Notification center for important updates

YOUR RESPONSIBILITIES:
• Review student no dues applications assigned to your department
• Approve or reject applications with proper comments
• Respond to email notifications promptly
• Use the dashboard to track all applications

SECURITY TIPS:
• Never share your password with anyone
• Use a unique password for this system
• Log out when finished
• Report any suspicious activity

NEED HELP?
Contact IT Support: seniormanager.it@jecrcu.edu.in

Quick Links:
🔑 Change Password: ${forgotPasswordURL}
🚀 Login Portal: ${loginURL}

---
JECRC University - No Dues Management System
This is an automated email. Please do not reply.
© ${new Date().getFullYear()} JECRC University. All rights reserved.
  `;
}

// Send email to a single staff member
async function sendWelcomeEmail(staff) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'JECRC No Dues <noreply.nodues@jecrcu.edu.in>',
    to: staff.email,
    subject: '🔐 JECRC No Dues System - Account Activation & Password Change Required',
    text: getEmailText(staff),
    html: getEmailHTML(staff),
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, email: staff.email };
  } catch (error) {
    console.error(`Failed to send email to ${staff.email}:`, error.message);
    return { success: false, email: staff.email, error: error.message };
  }
}

// Main function
async function sendCorrectedEmails() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Sending Welcome Emails to Corrected Staff Accounts     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Verify email configuration
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ Email configuration missing!');
    console.error('Please set SMTP_USER and SMTP_PASS in .env.local');
    process.exit(1);
  }

  console.log(`📧 Total emails to send: ${CORRECTED_STAFF.length}`);
  console.log(`📤 SMTP Server: ${process.env.SMTP_HOST}`);
  console.log(`👤 From: ${process.env.SMTP_FROM}\n`);
  console.log('🔄 Corrected Email Addresses:');
  console.log('   • ashokh.singh@jecrcu.edu.in → ashok.singh@jecrcu.edu.in');
  console.log('   • yogesh.jhoshi@jecrcu.edu.in → yogesh.joshi@jecrcu.edu.in\n');

  const results = {
    sent: [],
    failed: []
  };

  // Send emails with delay to avoid rate limiting
  for (let i = 0; i < CORRECTED_STAFF.length; i++) {
    const staff = CORRECTED_STAFF[i];
    console.log(`\n[${i + 1}/${CORRECTED_STAFF.length}] Sending to ${staff.email}...`);
    console.log(`   Name: ${staff.name}`);
    console.log(`   Department: ${staff.department}`);

    const result = await sendWelcomeEmail(staff);
    
    if (result.success) {
      console.log(`   ✅ Email sent successfully`);
      results.sent.push(result.email);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
      results.failed.push({ email: result.email, error: result.error });
    }

    // Wait 2 seconds between emails to avoid rate limiting
    if (i < CORRECTED_STAFF.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Print summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║              EMAIL SENDING SUMMARY                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (results.sent.length > 0) {
    console.log('✅ Successfully Sent:');
    console.log('─'.repeat(70));
    results.sent.forEach(email => console.log(`   ✓ ${email}`));
    console.log('─'.repeat(70));
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed:');
    console.log('─'.repeat(70));
    results.failed.forEach(item => console.log(`   ✗ ${item.email}: ${item.error}`));
    console.log('─'.repeat(70));
  }

  console.log('\n📊 Statistics:');
  console.log(`   Total: ${CORRECTED_STAFF.length}`);
  console.log(`   Sent: ${results.sent.length}`);
  console.log(`   Failed: ${results.failed.length}\n`);

  if (results.sent.length > 0) {
    console.log('✅ Corrected email notification complete!\n');
    console.log('⚠️  IMPORTANT REMINDERS:');
    console.log('─'.repeat(70));
    console.log('• Staff have been notified with temporary password: Test@1234');
    console.log('• They MUST change password before using the system');
    console.log('• Password reset URL: https://nodues.jecrcuniversity.edu.in/staff/forgot-password');
    console.log('• Staff login URL: https://nodues.jecrcuniversity.edu.in/staff/login');
    console.log('─'.repeat(70));
  }
}

// Run the script
sendCorrectedEmails()
  .then(() => {
    console.log('\n✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    console.error(error);
    process.exit(1);
  });