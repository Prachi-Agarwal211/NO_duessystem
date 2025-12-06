// This is a server-side utility for generating certificates as PDFs
// Using jsPDF for PDF generation with JECRC branding

import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Initialize Supabase Admin Client for file storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// JECRC Red color in RGB
const JECRC_RED = [196, 30, 58]; // #C41E3A
const GOLD_ACCENT = [218, 165, 32]; // #DAA520

export const generateCertificate = async (certificateData) => {
  try {
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
    // Using absolute positioning for better control
    
    try {
        const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo light.png');
        if (fs.existsSync(logoPath)) {
            const logoBase64 = fs.readFileSync(logoPath).toString('base64');
            const logoData = `data:image/png;base64,${logoBase64}`;
            
            // Logo centered at top
            // Actual dimensions are 1280x310 (Ratio ~4.13)
            const logoWidth = 90;
            const logoHeight = 22; // 90 / 4.13 approx
            pdf.addImage(logoData, 'PNG', (pageWidth / 2) - (logoWidth / 2), 25, logoWidth, logoHeight); 
        }
    } catch (e) {
        console.error("Error loading logo:", e);
    }

    // --- 3. Certificate Title ---
    const titleY = 60; // Adjusted up slightly since logo is shorter
    
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
    pdf.text('This is to certify that', pageWidth / 2, 82, { align: 'center' });
    
    // Student Name
    pdf.setFontSize(32);
    pdf.setFont('times', 'bolditalic');
    pdf.setTextColor(0, 0, 0);
    pdf.text(certificateData.studentName, pageWidth / 2, 98, { align: 'center' });
    
    // Underline for name
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(0, 0, 0);
    pdf.line(pageWidth / 2 - 55, 100, pageWidth / 2 + 55, 100);
    
    // Registration No
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    pdf.text(`Registration No.: ${certificateData.registrationNo}`, pageWidth / 2, 112, { align: 'center' });
    
    // Body Text
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text('has successfully cleared all dues from all departments', pageWidth / 2, 125, { align: 'center' });
    pdf.text('of JECRC University and is hereby granted', pageWidth / 2, 132, { align: 'center' });
    
    // Clearance Status (Stamp style)
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...JECRC_RED);
    pdf.text('NO DUES CLEARANCE', pageWidth / 2, 145, { align: 'center' });
    
    // --- 5. Academic Details Box ---
    const boxY = 152;
    const boxHeight = 24;
    const boxWidth = 160;
    
    // Background for details
    pdf.setFillColor(252, 252, 252); // Very light gray
    pdf.setDrawColor(230, 230, 230);
    pdf.rect(pageWidth / 2 - (boxWidth / 2), boxY, boxWidth, boxHeight, 'FD');
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    
    // Details Text
    const courseText = `Course: ${certificateData.course || 'N/A'}`;
    const branchText = `Branch: ${certificateData.branch || 'N/A'}`;
    const sessionText = `Session: ${certificateData.sessionFrom || 'N/A'} - ${certificateData.sessionTo || 'N/A'}`;
    
    pdf.text(`${courseText}   •   ${branchText}`, pageWidth / 2, boxY + 10, { align: 'center' });
    pdf.text(sessionText, pageWidth / 2, boxY + 18, { align: 'center' });
    
    // --- 6. Declaration ---
    const declY = 185;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    pdf.text('The student is hereby confirmed to have no outstanding financial or material', pageWidth / 2, declY, { align: 'center' });
    pdf.text('obligations to any department of the university.', pageWidth / 2, declY + 4, { align: 'center' });
    
    // --- 7. Date & Signature ---
    const footerY = 198;
    
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
    
    // Registrar Signature (Right)
    pdf.setDrawColor(...JECRC_RED);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth - 85, footerY - 6, pageWidth - 35, footerY - 6); // Line above text
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Registrar', pageWidth - 60, footerY, { align: 'center' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('JECRC University', pageWidth - 60, footerY + 5, { align: 'center' });

    // --- 8. Footer (ID) ---
    pdf.setFontSize(7);
    pdf.setTextColor(180, 180, 180);
    const certId = `Certificate ID: JECRC-ND-${certificateData.formId.substring(0, 8).toUpperCase()}`;
    pdf.text(certId, pageWidth / 2, pageHeight - 6, { align: 'center' });

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
    // Get form data
    const { data: formData, error } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*')
      .eq('id', formId)
      .single();
    
    if (error || !formData) {
      throw new Error('Form not found');
    }
    
    // Generate certificate
    const certificateResult = await generateCertificate({
      studentName: formData.student_name,
      registrationNo: formData.registration_no,
      course: formData.course,
      branch: formData.branch,
      sessionFrom: formData.session_from,
      sessionTo: formData.session_to,
      formId
    });
    
    // Update form record with certificate URL and final status
    const { error: updateError } = await supabaseAdmin
      .from('no_dues_forms')
      .update({ 
        final_certificate_generated: true,
        certificate_url: certificateResult.certificateUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId);
    
    if (updateError) {
      throw new Error('Failed to update form with certificate URL');
    }
    
    return {
      success: true,
      message: 'Certificate generated successfully',
      formId,
      certificateUrl: certificateResult.certificateUrl
    };
  } catch (error) {
    console.error('Error finalizing certificate:', error);
    throw new Error('Failed to finalize certificate');
  }
};