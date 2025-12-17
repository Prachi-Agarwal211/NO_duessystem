import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';

// Admin client bypasses RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Supabase Storage limits (free tier has 100KB per file limit)
const SUPABASE_MAX_SIZE = 100 * 1024; // 100KB - Supabase free tier limit
const USER_MAX_SIZE = 5 * 1024 * 1024; // 5MB - User-facing limit (we'll compress if needed)

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

    // Validate file size (max 5MB user-facing)
    if (file.size > USER_MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'File size exceeds 5MB limit. Please compress your file before uploading.'
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

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    let fileBuffer = Buffer.from(arrayBuffer);
    let finalContentType = file.type;

    // Compress PDF if it exceeds Supabase limit (100KB)
    if (file.type === 'application/pdf' && fileBuffer.length > SUPABASE_MAX_SIZE) {
      console.log(`📦 Compressing PDF: ${(fileBuffer.length / 1024).toFixed(2)}KB -> target: <100KB`);
      
      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        // Aggressive compression settings
        const compressedPdfBytes = await pdfDoc.save({
          useObjectStreams: false, // Better compatibility
          addDefaultPage: false,
          objectsPerTick: 50, // Faster processing
        });
        
        fileBuffer = Buffer.from(compressedPdfBytes);
        console.log(`✅ Compressed to: ${(fileBuffer.length / 1024).toFixed(2)}KB`);
        
        // If still too large, reject
        if (fileBuffer.length > SUPABASE_MAX_SIZE) {
          return NextResponse.json(
            {
              success: false,
              error: `File is too complex to compress below 100KB (current: ${(fileBuffer.length / 1024).toFixed(2)}KB). Please use a simpler PDF or reduce image quality.`
            },
            { status: 400 }
          );
        }
      } catch (compressionError) {
        console.error('❌ PDF compression failed:', compressionError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to compress PDF. Please try a different file or compress it manually.'
          },
          { status: 500 }
        );
      }
    }

    // Upload using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: finalContentType,
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