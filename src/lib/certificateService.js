// This is a server-side utility for generating certificates as PDFs
// Using jsPDF for PDF generation with JECRC branding

import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import {
  generateCertificateHash,
  generateTransactionId,
  createBlockchainRecord,
  generateQRData
} from './blockchainService';

// Initialize Supabase Admin Client for file storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// JECRC Red color in RGB
const JECRC_RED = [196, 30, 58]; // #C41E3A
const GOLD_ACCENT = [218, 165, 32]; // #DAA520

export const generateCertificate = async (certificateData, blockchainRecord) => {
  try {
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
    // Load logo using fetch API (works in all serverless environments)
    try {
      // Use hardcoded production URL for logo
      const logoUrl = 'https://nodues.jecrcuniversity.edu.in/assets/logo light.png';

      const response = await fetch(logoUrl);
      const logoBuffer = await response.arrayBuffer();
      const logoBase64 = Buffer.from(logoBuffer).toString('base64');
      const logoData = `data:image/png;base64,${logoBase64}`;

      // Logo centered at top
      // Actual dimensions are 1280x310 (Ratio ~4.13)
      const logoWidth = 90;
      const logoHeight = 22; // 90 / 4.13 approx
      pdf.addImage(logoData, 'PNG', (pageWidth / 2) - (logoWidth / 2), 25, logoWidth, logoHeight);
    } catch (e) {
      console.error("Error loading logo:", e);
      // Fallback to text-based header if logo fails
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...JECRC_RED);
      pdf.text('JECRC UNIVERSITY', pageWidth / 2, 35, { align: 'center' });

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Jaipur Engineering College & Research Centre', pageWidth / 2, 42, { align: 'center' });
    }

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

    console.log('✅ Database updated successfully');

    console.log('🎉 Certificate generation completed successfully!');

    return {
      success: true,
      message: 'Certificate generated successfully with blockchain verification',
      formId,
      certificateUrl: certificateResult.certificateUrl,
      blockchainHash: blockchainRecord.certificateHash,
      transactionId: blockchainRecord.transactionId
    };
  } catch (error) {
    console.error('❌ Fatal error in finalizeCertificate:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to finalize certificate: ${error.message}`);
  }
};