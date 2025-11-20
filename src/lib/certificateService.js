// This is a server-side utility for generating certificates as PDFs
// Using jsPDF for PDF generation with JECRC branding

import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client for file storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// JECRC Red color in RGB
const JECRC_RED = [196, 30, 58]; // #C41E3A

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
    
    // Add decorative border with JECRC red
    pdf.setDrawColor(...JECRC_RED);
    pdf.setLineWidth(3);
    pdf.rect(15, 15, pageWidth - 30, pageHeight - 30);
    
    // Add inner border
    pdf.setLineWidth(1);
    pdf.rect(20, 20, pageWidth - 40, pageHeight - 40);
    
    // Add decorative corner accents
    pdf.setFillColor(...JECRC_RED);
    const cornerSize = 8;
    // Top-left corner
    pdf.rect(20, 20, cornerSize, cornerSize, 'F');
    // Top-right corner
    pdf.rect(pageWidth - 20 - cornerSize, 20, cornerSize, cornerSize, 'F');
    // Bottom-left corner
    pdf.rect(20, pageHeight - 20 - cornerSize, cornerSize, cornerSize, 'F');
    // Bottom-right corner
    pdf.rect(pageWidth - 20 - cornerSize, pageHeight - 20 - cornerSize, cornerSize, cornerSize, 'F');
    
    // Add JECRC header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...JECRC_RED);
    pdf.text('JECRC UNIVERSITY', pageWidth / 2, 40, { align: 'center' });
    
    // Add subtitle
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Jaipur Engineering College & Research Centre', pageWidth / 2, 48, { align: 'center' });
    
    // Add certificate title with background
    pdf.setFillColor(...JECRC_RED);
    pdf.rect(pageWidth / 2 - 80, 58, 160, 16, 'F');
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('NO DUES CERTIFICATE', pageWidth / 2, 69, { align: 'center' });
    
    // Add certificate content
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text('This is to certify that', pageWidth / 2, 85, { align: 'center' });
    
    // Add student name with underline
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...JECRC_RED);
    pdf.text(certificateData.studentName, pageWidth / 2, 100, { align: 'center' });
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(...JECRC_RED);
    pdf.line(pageWidth / 2 - 70, 102, pageWidth / 2 + 70, 102);
    
    // Add registration number
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const regText = `Registration No.: ${certificateData.registrationNo}`;
    pdf.text(regText, pageWidth / 2, 112, { align: 'center' });
    
    // Add main certificate text
    pdf.setFontSize(15);
    pdf.text('has successfully cleared all dues from all departments', pageWidth / 2, 125, { align: 'center' });
    pdf.text('of JECRC University and is hereby granted', pageWidth / 2, 135, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.text('NO DUES CLEARANCE', pageWidth / 2, 145, { align: 'center' });
    
    // Add details box
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.rect(pageWidth / 2 - 80, 155, 160, 30);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    const details = [
      `Course: ${certificateData.course || 'N/A'}`,
      `Branch: ${certificateData.branch || 'N/A'}`,
      `Session: ${certificateData.sessionFrom || 'N/A'} - ${certificateData.sessionTo || 'N/A'}`
    ];
    
    let yPos = 163;
    details.forEach(detail => {
      pdf.text(detail, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
    });
    
    // Add declaration
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'italic');
    pdf.text('The student is hereby confirmed to have no outstanding financial or material', pageWidth / 2, 195, { align: 'center' });
    pdf.text('obligations to any department of the university.', pageWidth / 2, 202, { align: 'center' });
    
    // Add date with icon
    const issueDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Date of Issue: ${issueDate}`, pageWidth / 2, pageHeight - 60, { align: 'center' });
    
    // Add signature section with better styling
    pdf.setDrawColor(...JECRC_RED);
    pdf.setLineWidth(0.5);
    
    // Left signature
    pdf.line(40, pageHeight - 40, 100, pageHeight - 40);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Registrar', 70, pageHeight - 33, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('JECRC University', 70, pageHeight - 27, { align: 'center' });
    
    // Right signature
    pdf.setDrawColor(...JECRC_RED);
    pdf.line(pageWidth - 100, pageHeight - 40, pageWidth - 40, pageHeight - 40);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Controller of Examinations', pageWidth - 70, pageHeight - 33, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('JECRC University', pageWidth - 70, pageHeight - 27, { align: 'center' });
    
    // Add certificate ID at bottom
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    const certId = `Certificate ID: JECRC-ND-${certificateData.formId.substring(0, 8).toUpperCase()}`;
    pdf.text(certId, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
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