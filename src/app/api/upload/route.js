import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client bypasses RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/upload
 * Upload files to Supabase Storage using admin client (bypasses RLS)
 * 
 * FormData fields:
 * - file: File to upload (required)
 * - bucket: Target bucket name (default: 'no-dues-files')
 * - folder: Folder within bucket (default: 'manual-entries')
 * 
 * Returns:
 * - success: boolean
 * - url: Public URL of uploaded file
 * - path: Storage path of file
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const bucket = formData.get('bucket') || 'no-dues-files';
    const folder = formData.get('folder') || 'manual-entries';
    
    // Validation
    if (!file) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No file provided' 
        },
        { status: 400 }
      );
    }

    // Validate bucket name (security check)
    const allowedBuckets = ['no-dues-files', 'alumni-screenshots', 'certificates'];
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid bucket name' 
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false,
          error: 'File size exceeds 10MB limit' 
        },
        { status: 400 }
      );
    }

    // Validate file type (PDFs and images only)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid file type. Only PDF and images (JPEG, PNG, WebP) are allowed' 
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${folder}/${sanitizedName.substring(0, 100)}_${timestamp}`;

    console.log(`📤 Uploading file: ${filePath} to bucket: ${bucket}`);

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Upload error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: `Upload failed: ${error.message}` 
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log(`✅ File uploaded successfully: ${urlData.publicUrl}`);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
      bucket: bucket
    });

  } catch (error) {
    console.error('❌ Upload API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload?path=xxx&bucket=xxx
 * Delete a file from storage (admin only)
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const bucket = searchParams.get('bucket') || 'no-dues-files';

    if (!path) {
      return NextResponse.json(
        { 
          success: false,
          error: 'File path is required' 
        },
        { status: 400 }
      );
    }

    // Validate bucket name
    const allowedBuckets = ['no-dues-files', 'alumni-screenshots', 'certificates'];
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid bucket name' 
        },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting file: ${path} from bucket: ${bucket}`);

    // Delete using admin client
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('❌ Delete error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: `Delete failed: ${error.message}` 
        },
        { status: 500 }
      );
    }

    console.log(`✅ File deleted successfully: ${path}`);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}