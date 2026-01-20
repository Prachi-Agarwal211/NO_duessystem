#!/usr/bin/env node

/**
 * Quick SMTP Configuration Test
 * Tests the optimized SMTP configuration for Render
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the email service
const { sendEmail } = await import('../src/lib/emailService.js');

console.log('🧪 Testing SMTP Configuration...');
console.log('='.repeat(40));

// Test configuration
const testConfig = {
  to: process.env.SMTP_USER || 'test@example.com',
  subject: 'SMTP Configuration Test - JECRC No Dues',
  html: `
    <h2>SMTP Configuration Test</h2>
    <p>This is a test email to verify the SMTP configuration is working correctly.</p>
    <ul>
      <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
      <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
      <li><strong>Platform:</strong> ${process.platform}</li>
      <li><strong>Node Version:</strong> ${process.version}</li>
    </ul>
    <p>If you receive this email, the SMTP configuration is working correctly!</p>
  `
};

async function testSMTP() {
  try {
    console.log('📧 Sending test email...');
    const result = await sendEmail(testConfig);
    
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log(`📧 Message ID: ${result.messageId}`);
      console.log('🎉 SMTP configuration is working correctly!');
    } else {
      console.log('❌ Test email failed:');
      console.log(`   Error: ${result.error}`);
      console.log('💡 Check the SMTP configuration and credentials');
    }
  } catch (error) {
    console.log('❌ Test failed with error:');
    console.log(`   ${error.message}`);
    console.log('💡 Check the environment variables and network connectivity');
  }
}

testSMTP();
