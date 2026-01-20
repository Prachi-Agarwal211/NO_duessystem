#!/usr/bin/env node

/**
 * SMTP Diagnostic Script for Render Deployment
 * 
 * This script helps diagnose and fix SMTP connection issues in Render
 * Usage: node scripts/diagnose-smtp.js
 */

import nodemailer from 'nodemailer';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env');
let envContent = '';

try {
  envContent = readFileSync(envPath, 'utf8');
  console.log('✅ Environment file loaded');
} catch (error) {
  console.log('⚠️ No .env file found, using process.env');
}

// Parse environment variables
const env = {
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || 'JECRC No Dues <noreply@jecrcuniversity.edu.in>'
};

console.log('\n🔍 SMTP DIAGNOSTIC REPORT');
console.log('='.repeat(50));

// 1. Environment Check
console.log('\n📋 ENVIRONMENT CHECK:');
console.log(`   SMTP_HOST: ${env.SMTP_HOST}`);
console.log(`   SMTP_PORT: ${env.SMTP_PORT}`);
console.log(`   SMTP_SECURE: ${env.SMTP_SECURE}`);
console.log(`   SMTP_USER: ${env.SMTP_USER ? 'SET' : 'NOT SET'}`);
console.log(`   SMTP_PASS: ${env.SMTP_PASS ? 'SET' : 'NOT SET'}`);
console.log(`   SMTP_FROM: ${env.SMTP_FROM}`);

// 2. Network Connectivity Test
console.log('\n🌐 NETWORK CONNECTIVITY TEST:');
import { execSync } from 'child_process';

try {
  const pingResult = execSync(`ping -c 3 ${env.SMTP_HOST}`, { encoding: 'utf8', timeout: 10000 });
  console.log('   ✅ Network connectivity: OK');
} catch (error) {
  console.log('   ❌ Network connectivity: FAILED');
  console.log(`   Error: ${error.message}`);
}

// 3. SMTP Connection Test
console.log('\n🔌 SMTP CONNECTION TEST:');

const smtpConfig = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  },
  pool: true,
  maxConnections: 2,
  maxMessages: 20,
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
  requireTLS: true,
  ignoreTLS: false,
  disableFileAccess: true,
  disableUrlAccess: true
};

async function testSMTPConnection() {
  try {
    console.log('   📨 Creating transporter...');
    const transporter = nodemailer.createTransporter(smtpConfig);
    
    console.log('   🔍 Verifying connection...');
    await transporter.verify();
    
    console.log('   ✅ SMTP connection: SUCCESS');
    return true;
  } catch (error) {
    console.log('   ❌ SMTP connection: FAILED');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    
    // Provide specific error guidance
    if (error.code === 'EAUTH') {
      console.log('   💡 Solution: Check SMTP credentials (user/password)');
    } else if (error.code === 'ECONNECTION') {
      console.log('   💡 Solution: Network connectivity issue or firewall blocking');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   💡 Solution: Connection timeout - increase timeout settings');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   💡 Solution: DNS resolution issue - check SMTP host');
    }
    
    return false;
  }
}

// 4. Test Email Sending
async function testEmailSending() {
  console.log('\n📧 EMAIL SENDING TEST:');
  
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.log('   ⚠️ Skipping email test - credentials not configured');
    return false;
  }
  
  try {
    const transporter = nodemailer.createTransporter(smtpConfig);
    
    const testEmail = {
      from: env.SMTP_FROM,
      to: env.SMTP_USER, // Send to self for testing
      subject: 'SMTP Test - JECRC No Dues System',
      html: `
        <h2>SMTP Test Email</h2>
        <p>This is a test email from the JECRC No Dues System.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        <p><strong>Platform:</strong> ${process.platform}</p>
        <p><strong>Node Version:</strong> ${process.version}</p>
      `
    };
    
    console.log('   📤 Sending test email...');
    const result = await transporter.sendMail(testEmail);
    
    console.log('   ✅ Email sent: SUCCESS');
    console.log(`   📧 Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    console.log('   ❌ Email sending: FAILED');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// 5. Render-Specific Checks
console.log('\n☁️ RENDER-SPECIFIC CHECKS:');
console.log(`   Platform: ${process.env.RENDER ? 'Render.com' : 'Local/Other'}`);
console.log(`   Node Version: ${process.version}`);
console.log(`   Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

// 6. Recommendations
console.log('\n💡 RECOMMENDATIONS:');

if (!env.SMTP_USER || !env.SMTP_PASS) {
  console.log('   1. Configure SMTP credentials in Render dashboard');
  console.log('   2. Use Gmail App Password for better security');
  console.log('   3. Enable 2FA and create App Password');
} else {
  console.log('   1. SMTP credentials are configured');
}

if (process.env.RENDER) {
  console.log('   2. Running on Render - using optimized settings');
  console.log('   3. Connection timeouts set to 30 seconds');
  console.log('   4. Reduced connection pool for free tier');
} else {
  console.log('   2. Running locally - test with production settings');
}

console.log('   5. Monitor logs for connection issues');
console.log('   6. Consider using a dedicated email service for production');

// Run tests
async function runDiagnostics() {
  console.log('\n🚀 RUNNING DIAGNOSTICS...');
  
  const connectionOk = await testSMTPConnection();
  const emailOk = await testEmailSending();
  
  console.log('\n📊 DIAGNOSTIC SUMMARY:');
  console.log(`   Connection Test: ${connectionOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Email Test: ${emailOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (connectionOk && emailOk) {
    console.log('\n🎉 All tests passed! SMTP is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the recommendations above.');
  }
  
  console.log('\n' + '='.repeat(50));
}

runDiagnostics().catch(console.error);
