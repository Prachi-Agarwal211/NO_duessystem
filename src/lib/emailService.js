// This is a server-side utility for sending emails

import { render } from '@react-email/render';
import { NoDuesApprovalEmail } from '../components/emails/NoDuesApprovalEmail';
import { NoDuesSubmissionEmail } from '../components/emails/NoDuesSubmissionEmail';
import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, react }) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, using mock email service');
      // Fallback to mock implementation if API key is not configured
      console.log(`Mock email sent to: ${to}`);
      console.log(`Subject: ${subject}`);
      return { success: true, id: 'mock-id' };
    }

    const emailHtml = render(react);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'JECRC No Dues <onboarding@resend.dev>',
      to: [to],
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};
// Helper function to send status update notification to student
export const sendStatusUpdateNotification = async ({ email, studentName, action }) => {
  const emailComponent = NoDuesApprovalEmail({
    studentName,
    action, // 'approved' or 'rejected'
    status: action === 'approved' ? 'approved' : 'requires changes',
    statusDescription: action === 'approved'
      ? 'has been approved'
      : 'has been returned for corrections'
  });

  const subject = `No Dues Status Update - ${studentName}`;

  return await sendEmail({
    to: email,
    subject,
    react: emailComponent
  });
};

// Helper function to send form submission notification to department
export const sendSubmissionNotification = async ({ email, studentName, registrationNo, formId }) => {
  const emailComponent = NoDuesSubmissionEmail({
    studentName,
    registrationNo,
    formId
  });

  const subject = `New No Dues Application - ${studentName} (${registrationNo})`;
  
  return await sendEmail({
    to: email,
    subject,
    react: emailComponent
  });
};