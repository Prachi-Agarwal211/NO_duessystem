import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request) {
  try {
    // Parse form data for file upload
    const formData = await request.formData();
    const file = formData.get('file');
    const formId = formData.get('formId');

    if (!file || !formId) {
      return NextResponse.json({ error: 'File and form ID are required' }, { status: 400 });
    }

    // Verify user can upload to this form
    const { data: form, error: formError } = await supabase
      .from('no_dues_forms')
      .select('user_id')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || form.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `${session.user.id}/${timestamp}_${file.name}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('alumni-screenshots')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('alumni-screenshots')
      .getPublicUrl(filePath);

    // Update the form with the screenshot URL
    const { error: updateError } = await supabase
      .from('no_dues_forms')
      .update({ alumni_screenshot_url: publicUrl })
      .eq('id', formId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update form with file URL' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'File uploaded successfully',
      url: publicUrl,
      formId: formId,
      fileName: file.name
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}