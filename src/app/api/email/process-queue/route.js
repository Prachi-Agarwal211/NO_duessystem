/**
 * Email Queue Processor - Vercel Cron Compatible
 * Processes pending emails from the queue
 * Called by Vercel cron job every 5 minutes
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Initialize Supabase with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// SMTP configuration
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateLimit: 10
};

const FROM_EMAIL = process.env.SMTP_FROM || 'JECRC No Dues <noreply@jecrc.ac.in>';

// Create transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(SMTP_CONFIG);
  }
  return transporter;
}

/**
 * Process a single email from the queue
 */
async function processEmail(email) {
  try {
    // Update status to processing
    await supabase
      .from('email_queue')
      .update({ 
        status: 'processing',
        last_attempt_at: new Date().toISOString()
      })
      .eq('id', email.id);

    // Send email
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: FROM_EMAIL,
      to: email.to_address,
      subject: email.subject,
      html: email.html_content,
      text: email.text_content
    });

    // Mark as completed
    await supabase
      .from('email_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        error_message: null
      })
      .eq('id', email.id);

    console.log(`✅ Processed email ${email.id} - ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error(`❌ Failed to process email ${email.id}:`, error);

    // Increment attempts
    const newAttempts = email.attempts + 1;
    const maxRetries = email.max_retries || 3;

    if (newAttempts >= maxRetries) {
      // Max retries reached - mark as failed
      await supabase
        .from('email_queue')
        .update({
          status: 'failed',
          attempts: newAttempts,
          error_message: error.message
        })
        .eq('id', email.id);
      
      console.log(`❌ Email ${email.id} failed after ${newAttempts} attempts`);
    } else {
      // Reset to pending for retry
      const retryDelay = Math.pow(2, newAttempts) * 15; // 15, 30, 60 minutes
      const scheduledFor = new Date(Date.now() + retryDelay * 60 * 1000).toISOString();
      
      await supabase
        .from('email_queue')
        .update({
          status: 'pending',
          attempts: newAttempts,
          error_message: error.message,
          scheduled_for: scheduledFor
        })
        .eq('id', email.id);
      
      console.log(`⏰ Email ${email.id} rescheduled for retry ${newAttempts + 1}/${maxRetries} in ${retryDelay} minutes`);
    }

    return { success: false, error: error.message };
  }
}

/**
 * GET handler - Process email queue
 * Vercel cron compatible
 */
export async function GET(request) {
  const startTime = Date.now();
  const MAX_PROCESSING_TIME = 50000; // 50 seconds (safe for Vercel)
  const BATCH_SIZE = 50;

  try {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check SMTP configuration
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ SMTP not configured. Queue processing skipped.');
      return NextResponse.json({
        success: false,
        error: 'SMTP not configured',
        processed: 0
      });
    }

    console.log('🔄 Starting email queue processing...');

    // Fetch pending emails (due for processing)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('✅ No pending emails to process');
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No pending emails'
      });
    }

    console.log(`📧 Processing ${pendingEmails.length} pending emails...`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      retried: 0,
      details: []
    };

    // Process emails with timeout check
    for (const email of pendingEmails) {
      // Check if approaching timeout
      if (Date.now() - startTime > MAX_PROCESSING_TIME) {
        console.log(`⏰ Approaching timeout. Stopping at ${results.processed} emails.`);
        break;
      }

      const result = await processEmail(email);
      results.processed++;
      
      if (result.success) {
        results.succeeded++;
      } else {
        if (email.attempts + 1 < (email.max_retries || 3)) {
          results.retried++;
        } else {
          results.failed++;
        }
      }

      results.details.push({
        id: email.id,
        to: email.to_address,
        ...result
      });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Queue processing complete in ${duration}s`);
    console.log(`📊 Results: ${results.succeeded} sent, ${results.retried} retried, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      ...results,
      duration: `${duration}s`
    });

  } catch (error) {
    console.error('❌ Queue processing error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        processed: 0
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Manual queue processing trigger
 * Same as GET but allows manual triggering
 */
export async function POST(request) {
  return GET(request);
}