// This is a server-side utility for generating certificates as PDFs
// Using jsPDF for PDF generation

import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client for file storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    
    // Add certificate border
    pdf.setDrawColor(139, 69, 19); // Brown color
    pdf.setLineWidth(2);
    pdf.rect(20, 20, pageWidth - 40, pageHeight - 40);
    
    // Add inner border
    pdf.setLineWidth(1);
    pdf.rect(25, 25, pageWidth - 50, pageHeight - 50);
    
    // Add title
    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(139, 69, 19);
    pdf.text('NO DUES CERTIFICATE', pageWidth / 2, 60, { align: 'center' });
    
    // Add certificate content
    pdf.setFontSize(16);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text('This is to certify that', pageWidth / 2, 90, { align: 'center' });
    
    // Add student name
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(certificateData.studentName, pageWidth / 2, 110, { align: 'center' });
    
    // Add registration number
    pdf.setFontSize(16);
    pdf.setFont('times', 'normal');
    const regText = `bearing Registration No. ${certificateData.registrationNo}`;
    pdf.text(regText, pageWidth / 2, 130, { align: 'center' });
    
    // Add main certificate text
    pdf.text('has cleared all dues from all departments of JECRC College.', pageWidth / 2, 150, { align: 'center' });
    
    // Add details
    pdf.setFontSize(14);
    const details = [
      `Course: ${certificateData.course || 'N/A'}`,
      `Branch: ${certificateData.branch || 'N/A'}`,
      `Session: ${certificateData.sessionFrom || 'N/A'} - ${certificateData.sessionTo || 'N/A'}`
    ];
    
    let yPos = 175;
    details.forEach(detail => {
      pdf.text(detail, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
    });
    
    // Add declaration
    pdf.text('The student is hereby relieved of all financial obligations to the institution.', pageWidth / 2, yPos + 10, { align: 'center' });
    
    // Add date
    const issueDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.setFontSize(12);
    pdf.text(`Date of Issue: ${issueDate}`, pageWidth / 2, pageHeight - 70, { align: 'center' });
    
    // Add signature lines
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 4 - 50, pageHeight - 40, pageWidth / 4 + 50, pageHeight - 40);
    pdf.line(3 * pageWidth / 4 - 50, pageHeight - 40, 3 * pageWidth / 4 + 50, pageHeight - 40);
    
    // Add signature labels
    pdf.setFontSize(12);
    pdf.text('Registrar', pageWidth / 4, pageHeight - 30, { align: 'center' });
    pdf.text('JECRC College', pageWidth / 4, pageHeight - 20, { align: 'center' });
    pdf.text('Controller of Examinations', 3 * pageWidth / 4, pageHeight - 30, { align: 'center' });
    pdf.text('JECRC College', 3 * pageWidth / 4, pageHeight - 20, { align: 'center' });
    
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