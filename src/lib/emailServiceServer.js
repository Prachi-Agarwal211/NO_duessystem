/**
 * Server-only Email Service Wrapper
 * This file ensures nodemailer is only imported on the server side
 */

// Server-side only import
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Re-export all functions from emailService but with server-only guarantee
export async function sendCombinedDepartmentNotification(params) {
  if (typeof window !== 'undefined') {
    throw new Error('Email service can only be used on the server side');
  }
  
  // Dynamic import to avoid client-side bundling
  const { sendCombinedDepartmentNotification } = await import('./emailService.js');
  return sendCombinedDepartmentNotification(params);
}

export async function sendRejectionNotification(params) {
  if (typeof window !== 'undefined') {
    throw new Error('Email service can only be used on the server side');
  }
  
  const { sendRejectionNotification } = await import('./emailService.js');
  return sendRejectionNotification(params);
}

export async function sendCertificateReadyNotification(params) {
  if (typeof window !== 'undefined') {
    throw new Error('Email service can only be used on the server side');
  }
  
  const { sendCertificateReadyNotification } = await import('./emailService.js');
  return sendCertificateReadyNotification(params);
}

export async function sendReapplicationConfirmation(params) {
  if (typeof window !== 'undefined') {
    throw new Error('Email service can only be used on the server side');
  }
  
  const { sendReapplicationConfirmation } = await import('./emailService.js');
  return sendReapplicationConfirmation(params);
}

export async function sendReapplicationNotification(params) {
  if (typeof window !== 'undefined') {
    throw new Error('Email service can only be used on the server side');
  }
  
  const { sendReapplicationNotification } = await import('./emailService.js');
  return sendReapplicationNotification(params);
}

export async function sendStudentStatusUpdate(params) {
  if (typeof window !== 'undefined') {
    throw new Error('Email service can only be used on the server side');
  }
  
  const { sendStudentStatusUpdate } = await import('./emailService.js');
  return sendStudentStatusUpdate(params);
}

export async function sendDepartmentReminder(params) {
  if (typeof window !== 'undefined') {
    throw new Error('Email service can only be used on the server side');
  }
  
  const { sendDepartmentReminder } = await import('./emailService.js');
  return sendDepartmentReminder(params);
}

export async function sendDailyDepartmentDigest(params) {
  if (typeof window !== 'undefined') {
    throw new Error('Email service can only be used on the server side');
  }
  
  const { sendDailyDepartmentDigest } = await import('./emailService.js');
  return sendDailyDepartmentDigest(params);
}

export async function sendOtpEmail(params) {
  if (typeof window !== 'undefined') {
    throw new Error('Email service can only be used on the server side');
  }
  
  const { sendOtpEmail } = await import('./emailService.js');
  return sendOtpEmail(params);
}

export async function sendSupportTicketResponse(params) {
  if (typeof window !== 'undefined') {
    throw new Error('Email service can only be used on the server side');
  }
  
  const { sendSupportTicketResponse } = await import('./emailService.js');
  return sendSupportTicketResponse(params);
}

export async function sendEmail(params) {
  if (typeof window !== 'undefined') {
    throw new Error('Email service can only be used on the server side');
  }
  
  const { sendEmail } = await import('./emailService.js');
  return sendEmail(params);
}
