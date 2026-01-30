// Enhanced Certificate Service with Tracking and Notifications
// Using jsPDF for PDF generation with JECRC branding
// Includes automatic email delivery, blockchain verification, and analytics

import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import {
  generateCertificateHash,
  generateTransactionId,
  createBlockchainRecord,
  generateQRData
} from './blockchainService';
import { AuditLogger } from './auditLogger';

// Initialize Supabase Admin Client for file storage and database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// JECRC Red color in RGB
const JECRC_RED = [196, 30, 58]; // #C41E3A
const GOLD_ACCENT = [218, 165, 32]; // #DAA520

/**
 * Log certificate generation attempt
 */
async function logCertificateGeneration({ formId, registrationNo, status }) {
  try {
    await AuditLogger.log(
      AuditLogger.ACTIONS.GENERATE_CERTIFICATE,
      null, // actorId - system initiated
      { formId, registrationNo, status },
      formId
    );
    return { success: true };
  } catch (error) {
    console.error('Failed to log certificate generation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enhanced Certificate Generation with Tracking
 */
export const generateCertificate = async (certificateData, blockchainRecord) => {
  try {
    // Log certificate generation attempt
    const logEntry = await logCertificateGeneration({
      formId: certificateData.formId,
      registrationNo: certificateData.registrationNo,
      status: 'generating'
    });

    // blockchainRecord is now passed as parameter (created before certificate generation)

    // Generate QR code data with correct two-parameter signature
    const qrData = generateQRData(blockchainRecord, {
      formId: certificateData.formId,
      registrationNo: certificateData.registrationNo,
      studentName: certificateData.studentName
    });

    // Generate QR code image as base64
    const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 120,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Create a new PDF document
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Set up dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // --- 1. Ornamental Border ---
    // Outer Border (Gold)
    pdf.setDrawColor(...GOLD_ACCENT);
    pdf.setLineWidth(1.5);
    pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Main Border (Red)
    pdf.setDrawColor(...JECRC_RED);
    pdf.setLineWidth(2.5);
    pdf.rect(13, 13, pageWidth - 26, pageHeight - 26);

    // Inner Thin Border (Gold)
    pdf.setDrawColor(...GOLD_ACCENT);
    pdf.setLineWidth(0.5);
    pdf.rect(15, 15, pageWidth - 30, pageHeight - 30);

    // Corner Accents (Artistic)
    const drawCorner = (x, y, rotation) => {
      pdf.setDrawColor(...JECRC_RED);
      pdf.setLineWidth(1.5);
      const len = 15;
      // Simple L-shape with a dot
      if (rotation === 0) { // Top-Left
        pdf.line(x, y, x + len, y);
        pdf.line(x, y, x, y + len);
        pdf.setFillColor(...JECRC_RED);
        pdf.circle(x + 2, y + 2, 1, 'F');
      } else if (rotation === 90) { // Top-Right
        pdf.line(x, y, x - len, y);
        pdf.line(x, y, x, y + len);
        pdf.setFillColor(...JECRC_RED);
        pdf.circle(x - 2, y + 2, 1, 'F');
      } else if (rotation === 180) { // Bottom-Right
        pdf.line(x, y, x - len, y);
        pdf.line(x, y, x, y - len);
        pdf.setFillColor(...JECRC_RED);
        pdf.circle(x - 2, y - 2, 1, 'F');
      } else if (rotation === 270) { // Bottom-Left
        pdf.line(x, y, x + len, y);
        pdf.line(x, y, x, y - len);
        pdf.setFillColor(...JECRC_RED);
        pdf.circle(x + 2, y - 2, 1, 'F');
      }
    };

    drawCorner(18, 18, 0);
    drawCorner(pageWidth - 18, 18, 90);
    drawCorner(pageWidth - 18, pageHeight - 18, 180);
    drawCorner(18, pageHeight - 18, 270);

    // --- 2. Logo & Header ---
    // Using text-based header for smaller file size (works better with Supabase storage limits)
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...JECRC_RED);
    pdf.text('JECRC UNIVERSITY', pageWidth / 2, 32, { align: 'center' });

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Jaipur Engineering College & Research Centre', pageWidth / 2, 40, { align: 'center' });
    pdf.text('An Autonomous University | NAAC A+ Accredited', pageWidth / 2, 46, { align: 'center' });

    // --- 3. Certificate Title ---
    const titleY = 58; // Adjusted for text-based header

    // Decorative lines around title
    pdf.setDrawColor(...GOLD_ACCENT);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 65, titleY - 8, pageWidth / 2 + 65, titleY - 8);

    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...JECRC_RED);
    pdf.text('NO DUES CERTIFICATE', pageWidth / 2, titleY + 2, { align: 'center' });

    pdf.line(pageWidth / 2 - 65, titleY + 6, pageWidth / 2 + 65, titleY + 6);

    // --- 4. Main Content ---
    // Intro
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('This is to certify that', pageWidth / 2, 68, { align: 'center' });

    // Student Name
    pdf.setFontSize(32);
    pdf.setFont('times', 'bolditalic');
    pdf.setTextColor(0, 0, 0);
    pdf.text(certificateData.studentName, pageWidth / 2, 82, { align: 'center' });

    // Underline for name
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(0, 0, 0);
    pdf.line(pageWidth / 2 - 55, 84, pageWidth / 2 + 55, 84);

    // Registration No
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    pdf.text(`Registration No.: ${certificateData.registrationNo}`, pageWidth / 2, 94, { align: 'center' });

    // Body Text
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text('has successfully cleared all dues from all departments', pageWidth / 2, 106, { align: 'center' });
    pdf.text('of JECRC University and is hereby granted', pageWidth / 2, 112, { align: 'center' });

    // Clearance Status (Stamp style)
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...JECRC_RED);
    pdf.text('NO DUES CLEARANCE', pageWidth / 2, 122, { align: 'center' });

    // --- 5. Academic Details (No Box) ---
    const detailsY = 135;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);

    // Details Text
    const courseText = `Course: ${certificateData.course || 'N/A'}`;
    const branchText = `Branch: ${certificateData.branch || 'N/A'}`;
    const sessionText = `Session: ${certificateData.admissionYear || 'N/A'} - ${certificateData.passingYear || 'N/A'}`;

    pdf.text(`${courseText}   •   ${branchText}`, pageWidth / 2, detailsY, { align: 'center' });
    pdf.text(sessionText, pageWidth / 2, detailsY + 7, { align: 'center' });

    // --- 6. Date & Signature ---
    const footerY = 160;

    // Date (Left)
    const issueDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Date of Issue: ${issueDate}`, 45, footerY, { align: 'left' });

    // Registration Office Signature (Right)
    pdf.setDrawColor(...JECRC_RED);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth - 85, footerY - 6, pageWidth - 35, footerY - 6); // Line above text

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Registration Office', pageWidth - 60, footerY, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('JECRC University', pageWidth - 60, footerY + 5, { align: 'center' });

    // --- 7. QR Code (Bottom Left) ---
    const qrX = 25;
    const qrY = footerY - 35;
    const qrSize = 28;

    // Add QR Code (no labels - clean design)
    pdf.addImage(qrCodeImage, 'PNG', qrX, qrY, qrSize, qrSize);

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Generate filename
    const fileName = `no-dues-certificate-${certificateData.formId}-${Date.now()}.pdf`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('certificates')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error('Failed to save certificate to storage');
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('certificates')
      .getPublicUrl(fileName);

    return {
      success: true,
      certificateUrl: publicUrl,
      fileName,
      mimeType: 'application/pdf'
      // Don't return blockchain data here - it's already in blockchainRecord
    };
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw new Error('Failed to generate certificate');
  }
};

// Function to save certificate to storage
export const saveCertificate = async (certificateBuffer, fileName, formId) => {
  try {
    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('certificates')
      .upload(fileName, certificateBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
      });

    if (error) {
      throw new Error('Failed to save certificate to storage');
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('certificates')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error saving certificate:', error);
    throw new Error('Failed to save certificate');
  }
};

// Function to finalize certificate generation for a form
export const finalizeCertificate = async (formId) => {
  try {
    console.log('🔵 Step 1: Fetching form data for formId:', formId);

    // STEP 1: Get form data with department statuses
    const { data: formData, error } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status (
          department_name,
          status,
          action_at,
          action_by_user_id
        )
      `)
      .eq('id', formId)
      .single();

    if (error) {
      console.error('❌ Error fetching form data:', error);
      throw new Error(`Form fetch error: ${error.message}`);
    }

    if (!formData) {
      console.error('❌ Form not found');
      throw new Error('Form not found');
    }

    console.log('✅ Form data fetched successfully');

    console.log('🔵 Step 2: Creating blockchain record');

    // STEP 2: Create blockchain record FIRST (with correct data structure and department statuses)
    const blockchainRecord = await createBlockchainRecord({
      student_id: formId,  // Use formId as student_id
      registration_no: formData.registration_no,
      full_name: formData.student_name,  // Map student_name to full_name
      course: formData.course,
      branch: formData.branch,
      status: 'completed',
      completed_at: new Date().toISOString(),
      department_statuses: formData.no_dues_status || []  // Include actual department statuses
    });

    if (!blockchainRecord || !blockchainRecord.success) {
      console.error('❌ Blockchain record creation failed:', blockchainRecord);
      throw new Error('Failed to create blockchain record');
    }

    console.log('✅ Blockchain record created:', blockchainRecord.transactionId);

    console.log('🔵 Step 3: Generating certificate PDF');

    // STEP 3: Generate certificate WITH blockchain data
    const certificateResult = await generateCertificate({
      studentName: formData.student_name,
      registrationNo: formData.registration_no,
      course: formData.course,
      branch: formData.branch,
      admissionYear: formData.admission_year,
      passingYear: formData.passing_year,
      formId
    }, blockchainRecord);  // Pass blockchain record as second parameter

    if (!certificateResult || !certificateResult.success) {
      console.error('❌ Certificate generation failed:', certificateResult);
      throw new Error('Failed to generate certificate PDF');
    }

    console.log('✅ Certificate generated:', certificateResult.certificateUrl);

    console.log('🔵 Step 4: Updating database with certificate info');

    // STEP 4: Update form record with certificate URL, blockchain info, and final status
    const { error: updateError } = await supabaseAdmin
      .from('no_dues_forms')
      .update({
        final_certificate_generated: true,
        certificate_url: certificateResult.certificateUrl,
        blockchain_hash: blockchainRecord.certificateHash,
        blockchain_tx: blockchainRecord.transactionId,
        blockchain_block: blockchainRecord.blockNumber,
        blockchain_timestamp: blockchainRecord.timestamp,
        blockchain_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId);

    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      throw new Error(`Database update error: ${updateError.message}`);
    }

    console.log('✅ Certificate finalization complete for form:', formId);

    // Return success result
    return {
      success: true,
      certificateUrl: certificateResult.certificateUrl,
      blockchainRecord: blockchainRecord,
      formId: formId
    };

  } catch (error) {
    console.error('❌ Failed to finalize certificate:', error);
    // Re-throw to allow caller to handle the error
    throw error;
  }
}

/**
 * Get certificate statistics for dashboard
 */
export async function getCertificateStats(startDate, endDate) {
  try {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    const stats = {
      total: data.length,
      generated: data.filter(cert => cert.status === 'generated').length,
      sent: data.filter(cert => cert.email_sent).length,
      downloaded: data.filter(cert => cert.download_count > 0).length,
      blockchainVerified: data.filter(cert => cert.blockchain_tx_id).length,
      bySchool: data.reduce((acc, cert) => {
        acc[cert.school] = (acc[cert.school] || 0) + 1;
        return acc;
      }, {}),
      byCourse: data.reduce((acc, cert) => {
        acc[cert.course] = (acc[cert.course] || 0) + 1;
        return acc;
      }, {})
    };

    return stats;
  } catch (error) {
    console.error('Certificate stats error:', error);
    return null;
  }
}

/**
 * Get certificate by form ID
 */
export async function getCertificateByFormId(formId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('form_id', formId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Get certificate error:', error);
    return null;
  }
}

/**
 * Verify certificate authenticity
 */
export async function verifyCertificate(certificateId) {
  try {
    const certificate = await getCertificateByFormId(certificateId);

    if (!certificate) {
      return {
        valid: false,
        error: 'Certificate not found'
      };
    }

    // Update verification count
    await incrementVerificationCount(certificateId);

    return {
      valid: true,
      certificate,
      verifiedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Certificate verification error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Increment verification/download count
 */
async function incrementVerificationCount(certificateId) {
  try {
    const { error } = await supabaseAdmin
      .from('certificates')
      .update({
        download_count: supabaseAdmin.raw('download_count + 1'),
        last_download_at: new Date().toISOString()
      })
      .eq('certificate_id', certificateId);

    if (error) throw error;
  } catch (error) {
    console.error('Increment verification count error:', error);
  }
}

/**
 * Send certificate notification email
 */
export async function sendCertificateNotification(formData, certificateUrl) {
  try {
    // Import email service dynamically to avoid circular dependencies
    const emailService = await import('./emailService.js');

    const certificateData = {
      student_name: formData.student_name,
      registrationNo: formData.registration_no,
      verificationUrl: certificateUrl,
      certificateId: `CERT-${formData.id}`
    };

    await emailService.default.sendCertificateEmail(
      formData.college_email || formData.personal_email,
      certificateData
    );

    // Update certificate record to mark email as sent
    await updateCertificateRecord(certificateData.certificateId, {
      email_sent: true,
      email_sent_at: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('Certificate notification error:', error);
    return { success: false, error: error.message };
  }
}