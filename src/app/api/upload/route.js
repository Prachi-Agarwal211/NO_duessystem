import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { validateAndUploadAlumniScreenshot } from '@/lib/fileUpload';

// Centralized error response helper
const createErrorResponse = (message, status = 500, context = '') => {
  console.error(`Upload API Error ${context}:`, message);
  return NextResponse.json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  }, { status });
};

export async function POST(request) {
  try {
    // Parse form data for file upload
    const formData = await request.formData();
    const file = formData.get('file');
    const formId = formData.get('formId');
    const registrationNo = formData.get('registrationNo'); // Phase 1: Use registration number instead of auth

    if (!file || !formId || !registrationNo) {
      return createErrorResponse('File, form ID, and registration number are required', 400, 'validation');
    }

    // Phase 1: Verify form exists and matches registration number
    // In Phase 1, students don't have authentication, so we verify via registration number
    const { data: form, error: formError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no')
      .eq('id', formId)
      .eq('registration_no', registrationNo)
      .single();

    if (formError || !form) {
      return createErrorResponse('Form not found or registration number mismatch', 404, 'authorization');
    }

    // Use secure file upload service
    const uploadResult = await validateAndUploadAlumniScreenshot(file, registrationNo, formId);

    // Update the form with the screenshot URL
    const { error: updateError } = await supabase
      .from('no_dues_forms')
      .update({
        alumni_screenshot_url: uploadResult.url,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return createErrorResponse('Failed to update form with file URL', 500, 'database');
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      url: uploadResult.url,
      filename: uploadResult.filename,
      size: uploadResult.size,
      type: uploadResult.type,
      uploadDate: uploadResult.uploadDate,
      formId: formId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Handle specific validation errors
    if (error.message.includes('File size too large')) {
      return createErrorResponse('File size too large. Maximum allowed size is 5MB', 400, 'validation');
    }

    if (error.message.includes('File type not allowed')) {
      return createErrorResponse('File type not allowed. Only JPEG, PNG, and WebP images are supported', 400, 'validation');
    }

    if (error.message.includes('Invalid file name')) {
      return createErrorResponse('Invalid file name detected', 400, 'validation');
    }

    if (error.message.includes('Potentially dangerous file detected')) {
      return createErrorResponse('File contains potentially dangerous content', 400, 'security');
    }

    // Generic upload errors
    if (error.message.includes('upload failed')) {
      return createErrorResponse('File upload failed. Please try again', 500, 'upload');
    }

    // Fallback for unknown errors
    console.error('Unknown upload error:', error);
    return createErrorResponse('Internal server error during file upload', 500, 'general');
  }
}