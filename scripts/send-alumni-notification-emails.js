const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds
const JU_ALUMNI_EMAIL = 'cc@jualumni.in'; // CC email address

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email template
const createEmailContent = (student) => {
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
      <p>Dear <strong>${student.student_name}</strong>,</p>
      
      <p><strong>Registration No:</strong> ${student.registration_no}<br>
      <strong>Course:</strong> ${student.course || 'N/A'}<br>
      <strong>Branch:</strong> ${student.branch || 'N/A'}</p>
      
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
        Use this email: <strong>${student.personal_email}</strong></p>
        
        <p><span class="step-number">3</span> <strong>Fill in All Required Details:</strong></p>
        <ul>
          <li>📱 Contact Number: <strong>${student.contact_no || 'Your mobile number'}</strong></li>
          <li>💼 LinkedIn Profile URL</li>
          <li>📅 Batch/Passing Year: <strong>${student.passing_year || student.admission_year || 'Your batch'}</strong></li>
          <li>📚 Course: <strong>${student.course || 'Your course'}</strong></li>
          <li>🎯 Branch: <strong>${student.branch || 'Your branch'}</strong></li>
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

Dear ${student.student_name},

Registration No: ${student.registration_no}
Course: ${student.course || 'N/A'}
Branch: ${student.branch || 'N/A'}

⚠️ IMPORTANT: Alumni Registration Required

Your No Dues approval is pending because you haven't registered on the JU Alumni Portal.

To proceed with your online No Dues approval, you must first create and verify your profile on the JU Alumni Cell portal.

Complete Registration in 5 Simple Steps:

1. Visit the Alumni Portal
   Go to: jualumni.in

2. Sign Up with Your Personal Email
   Use: ${student.personal_email}

3. Fill in All Required Details:
   - Contact Number: ${student.contact_no || 'Your mobile number'}
   - LinkedIn Profile URL
   - Batch: ${student.passing_year || student.admission_year || 'Your batch'}
   - Course: ${student.course || 'Your course'}
   - Branch: ${student.branch || 'Your branch'}

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

// Queue email function
async function queueEmail(student) {
  try {
    const { htmlBody, textBody } = createEmailContent(student);
    
    const { data, error } = await supabase
      .from('email_queue')
      .insert({
        recipient_email: student.personal_email,
        subject: '🎓 Action Required: Register on JU Alumni Portal for No Dues Approval',
        html_body: htmlBody,
        text_body: textBody,
        status: 'pending',
        scheduled_for: new Date().toISOString(),
        metadata: {
          student_id: student.id,
          registration_no: student.registration_no,
          student_name: student.student_name,
          type: 'alumni_registration_notification',
          campaign: 'alumni_registration_reminder'
        }
      });

    if (error) throw error;
    
    console.log(`✅ Email queued for ${student.student_name} (${student.personal_email})`);
    return { success: true, student };
  } catch (error) {
    console.error(`❌ Failed to queue email for ${student.student_name}:`, error.message);
    return { success: false, student, error };
  }
}

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main function to send emails in batches
async function sendAlumniNotificationEmails() {
  console.log('🚀 Starting Alumni Registration Notification Email Campaign');
  console.log('=' .repeat(70));
  console.log(`📅 Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  console.log('=' .repeat(70));
  console.log('');

  try {
    // Check SMTP configuration
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️  WARNING: SMTP not configured. Emails will be queued but not sent.');
      console.log('Please configure SMTP_USER and SMTP_PASS in .env file.');
      console.log('');
    }

    // Fetch all students from no_dues_forms
    console.log('📊 Fetching students from database...');
    const { data: students, error: fetchError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, personal_email, college_email, contact_no, school, course, branch, admission_year, passing_year, status')
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    if (!students || students.length === 0) {
      console.log('📭 No students found in the database.');
      console.log('');
      return;
    }

    console.log(`✅ Found ${students.length} students`);
    console.log('');

    // Process students in batches
    const results = {
      total: students.length,
      queued: 0,
      failed: 0,
      failedStudents: []
    };

    const totalBatches = Math.ceil(students.length / BATCH_SIZE);

    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      console.log(`📦 Processing Batch ${batchNumber}/${totalBatches}`);
      console.log(`   Students in this batch: ${batch.length}`);
      console.log('-'.repeat(70));

      // Queue emails for this batch
      const batchPromises = batch.map(student =>
        queueEmail(student)
      );

      const batchResults = await Promise.all(batchPromises);

      // Update results
      batchResults.forEach(result => {
        if (result.success) {
          results.queued++;
        } else {
          results.failed++;
          results.failedStudents.push({
            name: result.student.student_name,
            registration_no: result.student.registration_no,
            email: result.student.personal_email,
            error: result.error?.message || 'Unknown error'
          });
        }
      });

      console.log(`   Batch ${batchNumber} complete: ${batchResults.filter(r => r.success).length} queued, ${batchResults.filter(r => !r.success).length} failed`);
      console.log('');

      // Delay between batches to avoid overwhelming the system
      if (i + BATCH_SIZE < students.length) {
        console.log(`⏸️  Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
        await delay(DELAY_BETWEEN_BATCHES);
        console.log('');
      }
    }

    // Print summary
    console.log('');
    console.log('=' .repeat(70));
    console.log('📊 EMAIL CAMPAIGN SUMMARY');
    console.log('=' .repeat(70));
    console.log(`📅 Completed At: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log('');
    console.log(`📧 Total Students: ${results.total}`);
    console.log(`✅ Successfully Queued: ${results.queued} (${((results.queued/results.total)*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${results.failed} (${((results.failed/results.total)*100).toFixed(1)}%)`);
    console.log('');
    
    if (results.failedStudents.length > 0) {
      console.log('❌ Failed Students Details:');
      console.log('-'.repeat(70));
      results.failedStudents.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.registration_no})`);
        console.log(`   Email: ${student.email}`);
        console.log(`   Error: ${student.error}`);
        console.log('');
      });
    }

    console.log('=' .repeat(70));
    console.log('💡 NEXT STEPS');
    console.log('=' .repeat(70));
    console.log('1. ✅ Emails are now queued in the email_queue table');
    console.log('2. 🔄 The cron job will process them automatically every 5 minutes');
    console.log('3. 📊 Monitor progress at: http://localhost:3000/api/email/status');
    console.log('4. 🔧 Manually trigger processing: http://localhost:3000/api/email/process-queue');
    console.log('');
    console.log('✉️  Note: Emails sent to students\' personal email addresses');
    console.log('=' .repeat(70));
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
console.log('');
console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + ' '.repeat(10) + 'JU ALUMNI REGISTRATION EMAIL CAMPAIGN' + ' '.repeat(20) + '║');
console.log('║' + ' '.repeat(15) + 'JECRC University No Dues System' + ' '.repeat(21) + '║');
console.log('╚' + '═'.repeat(68) + '╝');
console.log('');

sendAlumniNotificationEmails()
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