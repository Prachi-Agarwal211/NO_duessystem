/**
 * Test Email SMTP Configuration
 * Run this to diagnose email issues
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testEmail() {
  console.log('🧪 Testing SMTP Configuration...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Configuration:');
  console.log(`  Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  console.log(`  Port: ${process.env.SMTP_PORT || '587'}`);
  console.log(`  Secure: ${process.env.SMTP_SECURE || 'false'}`);
  console.log(`  User: ${process.env.SMTP_USER || 'NOT SET'}`);
  console.log(`  Pass: ${process.env.SMTP_PASS ? '****** (SET)' : 'NOT SET'}`);
  console.log(`  From: ${process.env.SMTP_FROM || 'NOT SET'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if credentials are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials not set!');
    console.error('\nPlease set these environment variables:');
    console.error('  SMTP_USER=your-email@gmail.com');
    console.error('  SMTP_PASS=your-app-password\n');
    console.error('For Gmail, you need an App Password:');
    console.error('  1. Go to https://myaccount.google.com/apppasswords');
    console.error('  2. Generate an App Password');
    console.error('  3. Use that 16-character password as SMTP_PASS\n');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  try {
    console.log('⏳ Step 1: Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    console.log('⏳ Step 2: Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to yourself
      subject: '✅ Test Email from JECRC No Dues System',
      html: `
        <h1>Success! 🎉</h1>
        <p>Your email configuration is working correctly.</p>
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li>Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
          <li>Port: ${process.env.SMTP_PORT || '587'}</li>
          <li>Secure: ${process.env.SMTP_SECURE || 'false'}</li>
        </ul>
        <p>This test was run at: ${new Date().toISOString()}</p>
      `,
      text: 'Success! Your email configuration is working correctly.'
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Accepted: ${info.accepted?.join(', ')}`);
    console.log(`   Response: ${info.response}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 All tests passed! Email is configured correctly.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Email test failed!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('\nError Details:');
    console.error(`  Message: ${error.message}`);
    console.error(`  Code: ${error.code || 'N/A'}`);
    console.error(`  Command: ${error.command || 'N/A'}`);
    
    console.error('\n🔍 Troubleshooting Guide:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (error.code === 'ETIMEDOUT') {
      console.error('⏱️  CONNECTION TIMEOUT');
      console.error('\nPossible causes:');
      console.error('  1. Firewall blocking SMTP connections');
      console.error('     → Check if your hosting provider (Render) blocks SMTP');
      console.error('     → Try port 465 with SMTP_SECURE=true');
      console.error('  2. Wrong SMTP_HOST or SMTP_PORT');
      console.error('     → Verify SMTP_HOST=smtp.gmail.com');
      console.error('     → Verify SMTP_PORT=587');
      console.error('  3. Network issues');
      console.error('     → Try from a different network');
      console.error('     → Check if VPN is interfering\n');
      
    } else if (error.code === 'EAUTH') {
      console.error('🔐 AUTHENTICATION FAILED');
      console.error('\nPossible causes:');
      console.error('  1. Wrong SMTP_USER or SMTP_PASS');
      console.error('     → Double-check your credentials');
      console.error('  2. Using regular Gmail password instead of App Password');
      console.error('     → Generate App Password: https://myaccount.google.com/apppasswords');
      console.error('     → Must enable 2-Step Verification first');
      console.error('  3. Less Secure Apps disabled (Gmail default)');
      console.error('     → Use App Password instead\n');
      
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 HOST NOT FOUND');
      console.error('\nPossible causes:');
      console.error('  1. Wrong SMTP_HOST');
      console.error('     → Check spelling: smtp.gmail.com');
      console.error('  2. DNS resolution issues');
      console.error('     → Try pinging smtp.gmail.com');
      console.error('  3. No internet connection\n');
      
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🚫 CONNECTION REFUSED');
      console.error('\nPossible causes:');
      console.error('  1. Wrong SMTP_PORT');
      console.error('     → Try 587 (TLS) or 465 (SSL)');
      console.error('  2. SMTP service is down');
      console.error('     → Check Gmail status');
      console.error('  3. Port is blocked');
      console.error('     → Try alternative port\n');
      
    } else {
      console.error('❓ UNKNOWN ERROR');
      console.error('\nGeneral troubleshooting:');
      console.error('  1. Verify all environment variables are set');
      console.error('  2. Check SMTP provider documentation');
      console.error('  3. Try a different SMTP service (SendGrid, Resend)');
      console.error('  4. Contact your hosting provider support\n');
    }
    
    console.error('📚 Full Documentation:');
    console.error('  → See EMAIL_DIAGNOSTIC_AND_FIX.md for detailed solutions\n');
    
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

testEmail();