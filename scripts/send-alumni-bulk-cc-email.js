const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Email template
const createEmailContent = () => {
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 30px; background-color: #f9fafb; border: 1px solid #e5e7eb; }
    .button { display: inline-block; padding: 14px 28px; background-color: #1e40af; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; }
    .important { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; border-radius: 4px; }
    .steps { background-color: white; padding: 20px; border-radius: 6px; margin: 15px 0; }
    .step-number { background-color: #1e40af; color: white; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 10px; }
    h3 { color: #1e40af; margin-top: 20px; }
    ul { line-height: 1.8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 JECRC University - No Dues Certificate</h1>
    </div>
    
    <div class="content">
      <p>Dear Students,</p>
      
      <div class="important">
        <h3>⚠️ IMPORTANT: Alumni Registration Required</h3>
        <p><strong>Your No Dues approval is pending because you haven't registered on the JU Alumni Portal.</strong></p>
        <p>To proceed with your online No Dues approval, you must first create and verify your profile on the JU Alumni Cell portal.</p>
      </div>
      
      <div class="steps">
        <h3>📝 Complete Registration in 5 Simple Steps:</h3>
        
        <p><span class="step-number">1</span> <strong>Visit the Alumni Portal</strong><br>
        Go to <a href="https://jualumni.in" style="color: #1e40af;">jualumni.in</a></p>
        
        <p><span class="step-number">2</span> <strong>Sign Up with Your Personal Email</strong><br>
        Use the personal email address you registered with JECRC</p>
        
        <p><span class="step-number">3</span> <strong>Fill in All Required Details:</strong></p>
        <ul>
          <li>📱 Contact Number</li>
          <li>💼 LinkedIn Profile URL</li>
          <li>📅 Batch/Passing Year</li>
          <li>📚 Course</li>
          <li>🎯 Branch</li>
        </ul>
        
        <p><span class="step-number">4</span> <strong>Submit Your Profile</strong><br>
        Review all information and submit for verification</p>
        
        <p><span class="step-number">5</span> <strong>Wait for Alumni Cell Approval</strong><br>
        You'll receive confirmation once approved</p>
      </div>
      
      <div style="text-align: center;">
        <a href="https://jualumni.in" class="button">🚀 Register Now on JU Alumni Portal</a>
      </div>
      
      <div class="important">
        <p><strong>⏰ Please Note:</strong></p>
        <ul style="margin: 10px 0;">
          <li>This is a <strong>mandatory requirement</strong> for all students</li>
          <li>Your No Dues approval will <strong>NOT proceed</strong> until Alumni registration is complete</li>
          <li>Complete your registration at the earliest to avoid delays</li>
        </ul>
      </div>
      
      <h3>📞 Need Help?</h3>
      <p>If you face any issues during registration, please contact:</p>
      <ul>
        <li><strong>Alumni Cell:</strong> support@jualumni.in</li>
        <li><strong>No Dues Support:</strong> nodues@jecrc.ac.in</li>
      </ul>
      
      <p style="margin-top: 30px;">Best regards,<br>
      <strong>JECRC University<br>No Dues Management Team</strong></p>
    </div>
    
    <div class="footer">
      <p>This is an automated message from JECRC University No Dues System</p>
      <p>&copy; ${new Date().getFullYear()} JECRC University. All rights reserved.</p>
      <p style="margin-top: 10px;">
        <a href="https://jualumni.in" style="color: #1e40af; text-decoration: none;">JU Alumni Portal</a> | 
        <a href="https://jecrc.ac.in" style="color: #1e40af; text-decoration: none;">JECRC University</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
JECRC University - No Dues Certificate

Dear Students,

⚠️ IMPORTANT: Alumni Registration Required

Your No Dues approval is pending because you haven't registered on the JU Alumni Portal.

To proceed with your online No Dues approval, you must first create and verify your profile on the JU Alumni Cell portal.

Complete Registration in 5 Simple Steps:

1. Visit the Alumni Portal
   Go to: jualumni.in

2. Sign Up with Your Personal Email
   Use the personal email address you registered with JECRC

3. Fill in All Required Details:
   - Contact Number
   - LinkedIn Profile URL
   - Batch/Passing Year
   - Course
   - Branch

4. Submit Your Profile
   Review all information and submit for verification

5. Wait for Alumni Cell Approval
   You'll receive confirmation once approved

⏰ Please Note:
- This is a mandatory requirement for all students
- Your No Dues approval will NOT proceed until Alumni registration is complete
- Complete your registration at the earliest to avoid delays

Need Help?
- Alumni Cell: support@jualumni.in
- No Dues Support: nodues@jecrc.ac.in

Best regards,
JECRC University
No Dues Management Team

---
This is an automated message from JECRC University No Dues System
© ${new Date().getFullYear()} JECRC University. All rights reserved.

Visit: https://jualumni.in
  `;

  return { htmlBody, textBody };
};

// Main function
async function sendBulkCCEmail() {
  console.log('');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(10) + 'JU ALUMNI REGISTRATION BULK EMAIL (CC)' + ' '.repeat(19) + '║');
  console.log('║' + ' '.repeat(15) + 'JECRC University No Dues System' + ' '.repeat(21) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  console.log('');
  console.log('🚀 Starting Alumni Registration Bulk CC Email Campaign');
  console.log('=' .repeat(70));
  console.log(`📅 Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  console.log('=' .repeat(70));
  console.log('');

  try {
    // Check SMTP configuration
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP not configured. Please set SMTP_USER and SMTP_PASS in .env.local');
    }

    // Fetch all students from no_dues_forms
    console.log('📊 Fetching students from database...');
    const { data: students, error: fetchError } = await supabase
      .from('no_dues_forms')
      .select('personal_email')
      .not('personal_email', 'is', null)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    if (!students || students.length === 0) {
      console.log('📭 No students found in the database.');
      return;
    }

    // Extract unique personal emails
    const personalEmails = [...new Set(students.map(s => s.personal_email).filter(e => e))];
    
    console.log(`✅ Found ${students.length} total records`);
    console.log(`✅ Found ${personalEmails.length} unique personal email addresses`);
    console.log('');

    // Create email content
    const { htmlBody, textBody } = createEmailContent();

    // Send email with all students in CC
    console.log('📧 Sending bulk email with all students in CC...');
    console.log('');

    const mailOptions = {
      from: process.env.SMTP_FROM || 'JECRC No Dues <noreply.nodues@jecrcu.edu.in>',
      to: 'cc@jualumni.in', // Primary recipient
      cc: personalEmails.join(', '), // All students in CC
      subject: '🎓 Action Required: Register on JU Alumni Portal for No Dues Approval',
      html: htmlBody,
      text: textBody
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully!');
    console.log('');
    console.log('=' .repeat(70));
    console.log('📊 EMAIL DETAILS');
    console.log('=' .repeat(70));
    console.log(`📧 To: cc@jualumni.in`);
    console.log(`📧 CC: ${personalEmails.length} student email addresses`);
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`✉️  Subject: Action Required: Register on JU Alumni Portal`);
    console.log('=' .repeat(70));
    console.log('');
    console.log('✅ All students have been notified via CC in a single email');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('=' .repeat(70));
    console.error('❌ FATAL ERROR');
    console.error('=' .repeat(70));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('=' .repeat(70));
    process.exit(1);
  }
}

// Run the script
sendBulkCCEmail()
  .then(() => {
    console.log('✅ Script completed successfully');
    console.log('');
    process.exit(0);
  })
  .catch(error => {
    console.error('');
    console.error('❌ Script failed with error:', error.message);
    console.error('');
    process.exit(1);
  });