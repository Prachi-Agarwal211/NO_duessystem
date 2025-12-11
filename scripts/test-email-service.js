/**
 * Test Email Service Configuration
 * Verifies Resend API key and email sending capability
 */

import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function testEmailService() {
  console.log('\n📧 Testing Email Service Configuration...\n');

  // Check if RESEND_API_KEY is configured
  console.log('1️⃣ Checking RESEND_API_KEY:');
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.log('   ❌ RESEND_API_KEY is NOT configured');
    console.log('   💡 Add RESEND_API_KEY to your .env.local file');
    console.log('   💡 Get your API key from: https://resend.com/api-keys');
    return;
  }
  
  console.log(`   ✅ RESEND_API_KEY is configured (${apiKey.substring(0, 10)}...)`);

  // Initialize Resend
  console.log('\n2️⃣ Initializing Resend client:');
  const resend = new Resend(apiKey);
  console.log('   ✅ Resend client initialized');

  // Test email send
  console.log('\n3️⃣ Testing email send capability:');
  console.log('   Sending test email...');

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'JECRC No Dues <onboarding@resend.dev>',
      to: ['15anuragsingh2003@gmail.com'], // Test email
      subject: 'Test Email from JECRC No Dues System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">✅ Email Service Test</h2>
          <p>This is a test email from your JECRC No Dues System.</p>
          <p>If you received this email, your email service is working correctly!</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Test performed at: ${new Date().toISOString()}<br>
            API Key: ${apiKey.substring(0, 10)}...
          </p>
        </div>
      `
    });

    if (error) {
      console.log('   ❌ Email send FAILED');
      console.log('   Error:', error);
      
      if (error.message?.includes('API key')) {
        console.log('\n   💡 Your API key appears to be invalid');
        console.log('   💡 Get a new key from: https://resend.com/api-keys');
      } else if (error.message?.includes('domain')) {
        console.log('\n   💡 You need to verify your domain in Resend');
        console.log('   💡 Or use the default: onboarding@resend.dev');
      }
      return;
    }

    console.log('   ✅ Email sent successfully!');
    console.log(`   📧 Email ID: ${data.id}`);
    console.log('\n4️⃣ Verification:');
    console.log('   1. Check your inbox: 15anuragsingh2003@gmail.com');
    console.log('   2. Check Resend dashboard: https://resend.com/emails');
    console.log(`   3. Look for email ID: ${data.id}`);

  } catch (error) {
    console.log('   ❌ Unexpected error:', error.message);
  }

  console.log('\n✅ Test complete!\n');
}

testEmailService().catch(console.error);