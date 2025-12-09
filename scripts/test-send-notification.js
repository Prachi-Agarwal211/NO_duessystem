/**
 * Test Email Notification Sending
 * 
 * Simulates sending a notification email to verify:
 * 1. Resend API configuration is correct
 * 2. Email templates render properly
 * 3. Staff receives notifications successfully
 * 
 * Usage: node scripts/test-send-notification.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Import email service functions
const { Resend } = require('resend');

async function sendTestNotification() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         Testing Email Notification System              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Verify environment variables
    console.log('🔍 Step 1: Verifying configuration...\n');
    
    if (!process.env.RESEND_API_KEY) {
      throw new Error('❌ RESEND_API_KEY not found in environment');
    }
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('❌ Supabase credentials not found in environment');
    }
    
    console.log('✅ RESEND_API_KEY found');
    console.log('✅ Supabase credentials found\n');

    // 2. Fetch staff members
    console.log('🔍 Step 2: Fetching staff members...\n');
    
    const { data: staffMembers, error: staffError } = await supabase
      .from('profiles')
      .select('id, email, full_name, department_name')
      .eq('role', 'department')
      .not('email', 'is', null);

    if (staffError) {
      throw new Error(`❌ Error fetching staff: ${staffError.message}`);
    }

    if (!staffMembers || staffMembers.length === 0) {
      throw new Error('❌ No staff members found. Run create-test-staff.js first.');
    }

    console.log(`✅ Found ${staffMembers.length} staff member(s):`);
    staffMembers.forEach(staff => {
      console.log(`   - ${staff.full_name} <${staff.email}> (${staff.department_name})`);
    });
    console.log('');

    // 3. Initialize Resend
    console.log('🔍 Step 3: Initializing Resend API...\n');
    
    const resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend API initialized\n');

    // 4. Prepare test notification data
    const testData = {
      studentName: 'Test Student',
      registrationNo: 'TEST123456',
      formId: 'test-form-id-' + Date.now(),
      dashboardUrl: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/staff/dashboard`
        : 'http://localhost:3000/staff/dashboard'
    };

    console.log('📋 Test Notification Data:');
    console.log('─'.repeat(60));
    console.log(`   Student Name:       ${testData.studentName}`);
    console.log(`   Registration No:    ${testData.registrationNo}`);
    console.log(`   Form ID:            ${testData.formId}`);
    console.log(`   Dashboard URL:      ${testData.dashboardUrl}`);
    console.log('─'.repeat(60));
    console.log('');

    // 5. Send email to each staff member
    console.log('📧 Step 4: Sending test notifications...\n');

    const emailPromises = staffMembers.map(async (staff) => {
      try {
        console.log(`   → Sending to ${staff.email}...`);
        
        const emailData = await resend.emails.send({
          from: 'JECRC No Dues <onboarding@resend.dev>',
          to: staff.email,
          subject: `🧪 TEST: New No Dues Application - ${testData.registrationNo}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New No Dues Application</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🧪 TEST NOTIFICATION</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">JECRC No Dues System</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px;">
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0; color: #856404;">
        <strong>⚠️ This is a test email</strong><br>
        Sent to verify the unified notification system is working correctly.
      </p>
    </div>

    <p style="margin-top: 0;">Dear <strong>${staff.full_name}</strong>,</p>
    
    <p>A new No Dues application has been submitted and requires your attention:</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Student Name:</td>
          <td style="padding: 8px 0;"><strong>${testData.studentName}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Registration No:</td>
          <td style="padding: 8px 0;"><strong>${testData.registrationNo}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Your Department:</td>
          <td style="padding: 8px 0;"><strong>${staff.department_name || 'N/A'}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Submitted:</td>
          <td style="padding: 8px 0;"><strong>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</strong></td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${testData.dashboardUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
        📋 Review Application
      </a>
    </div>

    <div style="background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin-top: 20px; border-radius: 4px;">
      <p style="margin: 0; color: #004085; font-size: 14px;">
        <strong>📊 System Status:</strong><br>
        • Unified notification system: ✅ Active<br>
        • Email routing: Staff account emails<br>
        • Test timestamp: ${new Date().toISOString()}
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e9ecef; margin: 25px 0;">
    
    <p style="font-size: 14px; color: #6c757d; margin-bottom: 0;">
      This is an automated test email from JECRC No Dues System.<br>
      If you received this, the notification system is working correctly! ✅
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
    <p>© 2025 JECRC University. All rights reserved.</p>
  </div>

</body>
</html>
          `,
        });

        console.log(`   ✓ Response:`, emailData);
        
        return {
          success: true,
          staff: staff.full_name,
          email: staff.email,
          messageId: emailData.data?.id || emailData.id || 'no-id-returned',
          fullResponse: emailData
        };
      } catch (error) {
        console.log(`   ✗ Error:`, error);
        
        return {
          success: false,
          staff: staff.full_name,
          email: staff.email,
          error: error.message,
          fullError: error
        };
      }
    });

    const results = await Promise.all(emailPromises);

    // 6. Display results
    console.log('📊 Notification Results:');
    console.log('─'.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0) {
      console.log('\n✅ Successfully sent:');
      successful.forEach(result => {
        console.log(`   ✓ ${result.staff} <${result.email}>`);
        console.log(`     Message ID: ${result.messageId}`);
        if (result.fullResponse) {
          console.log(`     Full Response:`, JSON.stringify(result.fullResponse, null, 2));
        }
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed to send:');
      failed.forEach(result => {
        console.log(`   ✗ ${result.staff} <${result.email}>`);
        console.log(`     Error: ${result.error}`);
        if (result.fullError) {
          console.log(`     Full Error:`, JSON.stringify(result.fullError, null, 2));
        }
      });
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`Total: ${results.length} | Success: ${successful.length} | Failed: ${failed.length}`);
    console.log('─'.repeat(60) + '\n');

    // 7. Summary
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                   TEST SUMMARY                          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    if (failed.length === 0) {
      console.log('✅ ALL TESTS PASSED!\n');
      console.log('Next Steps:');
      console.log('─'.repeat(60));
      console.log('1. Check inbox at: 15anuragsingh2003@gmail.com');
      console.log('2. Verify email content and formatting');
      console.log('3. Click "Review Application" button');
      console.log('4. Confirm dashboard link works');
      console.log('5. Submit a real form to test end-to-end flow');
      console.log('─'.repeat(60) + '\n');
      console.log('🎉 The unified notification system is working!\n');
    } else {
      console.log('⚠️  SOME TESTS FAILED\n');
      console.log('Troubleshooting:');
      console.log('─'.repeat(60));
      console.log('1. Verify RESEND_API_KEY is valid');
      console.log('2. Check Resend dashboard for errors');
      console.log('3. Ensure sender domain is verified');
      console.log('4. Review staff email addresses');
      console.log('5. Check Resend API limits/quota');
      console.log('─'.repeat(60) + '\n');
    }

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('\nError Details:', error);
    console.error('\nTroubleshooting:');
    console.error('  1. Verify .env.local has RESEND_API_KEY');
    console.error('  2. Check Supabase connection');
    console.error('  3. Ensure staff account exists (run create-test-staff.js)');
    console.error('  4. Verify Resend account is active\n');
    process.exit(1);
  }
}

// Main execution
sendTestNotification()
  .then(() => {
    console.log('✅ Test completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });