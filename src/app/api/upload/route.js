import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';

// Admin client bypasses RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { ApiResponse } from '@/lib/apiResponse';

// Force dynamic rendering - this route uses request.url
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

// ✅ STRICT STORAGE LIMITS (enforced at API level)
const LIMITS = {
  'alumni-screenshots': 100 * 1024, // 100 KB for Alumni
  'no-dues-files': 200 * 1024,      // 200 KB for Manual entries
  'certificates': 200 * 1024,       // 200 KB for Certificates
  'default': 200 * 1024             // 200 KB default
};

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
    // Rate limit check
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.UPLOAD);
    if (!rateLimitCheck.success) {
      return NextResponse.json(
        { error: rateLimitCheck.error || 'Too many uploads. Please wait.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const bucket = formData.get('bucket') || 'no-dues-files';
    const folder = formData.get('folder') || 'manual-entries';

    // Validation
    if (!file) {
      // Validation
      if (!file) {
        return ApiResponse.error('No file provided', 400);
      }
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

    // ✅ VALIDATE FILE SIZE - Bucket-specific limits
    const maxLimit = LIMITS[bucket] || LIMITS['default'];

    // For non-PDF files, reject immediately if over limit
    if (file.type !== 'application/pdf' && file.size > maxLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large! Maximum size for this upload is ${(maxLimit / 1024).toFixed(0)}KB. Please compress your file.`
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

    // ✅ COMPRESS PDF if it exceeds bucket limit
    if (file.type === 'application/pdf' && fileBuffer.length > maxLimit) {
      console.log(`📦 Compressing PDF: ${(fileBuffer.length / 1024).toFixed(2)}KB -> target: <${(maxLimit / 1024).toFixed(0)}KB`);

      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        // Multi-pass aggressive compression
        let compressedPdfBytes;
        let compressionAttempt = 1;
        const maxAttempts = 3;

        // First pass: Standard compression with metadata removal
        compressedPdfBytes = await pdfDoc.save({
          useObjectStreams: false,
          addDefaultPage: false,
          objectsPerTick: 50,
        });

        let currentSize = compressedPdfBytes.length;
        console.log(`  Pass ${compressionAttempt}: ${(currentSize / 1024).toFixed(2)}KB`);

        // Second pass: If still too large, reload and recompress with aggressive settings
        if (currentSize > maxLimit && compressionAttempt < maxAttempts) {
          compressionAttempt++;
          const reloadedDoc = await PDFDocument.load(compressedPdfBytes);

          // Flatten form fields and annotations to reduce size
          const pages = reloadedDoc.getPages();
          for (const page of pages) {
            // This helps compress complex PDFs with forms/annotations
            page.setRotation({ type: 'degrees', angle: 0 });
          }

          compressedPdfBytes = await reloadedDoc.save({
            useObjectStreams: false,
            addDefaultPage: false,
            objectsPerTick: 20, // More aggressive
          });

          currentSize = compressedPdfBytes.length;
          console.log(`  Pass ${compressionAttempt}: ${(currentSize / 1024).toFixed(2)}KB`);
        }

        // Third pass: If STILL too large, try one final compression
        if (currentSize > maxLimit && compressionAttempt < maxAttempts) {
          compressionAttempt++;
          const finalDoc = await PDFDocument.load(compressedPdfBytes);

          compressedPdfBytes = await finalDoc.save({
            useObjectStreams: false,
            addDefaultPage: false,
            objectsPerTick: 10, // Most aggressive
          });

          currentSize = compressedPdfBytes.length;
          console.log(`  Pass ${compressionAttempt}: ${(currentSize / 1024).toFixed(2)}KB`);
        }

        fileBuffer = Buffer.from(compressedPdfBytes);
        const finalSizeKB = (fileBuffer.length / 1024).toFixed(2);
        console.log(`✅ Final compressed size: ${finalSizeKB}KB after ${compressionAttempt} passes`);

        // ✅ If still too large after all attempts, provide detailed error
        if (fileBuffer.length > maxLimit) {
          const originalSizeKB = (file.size / 1024).toFixed(2);
          const compressedSizeKB = (fileBuffer.length / 1024).toFixed(2);
          const targetSizeKB = (maxLimit / 1024).toFixed(0);
          const reductionPercent = ((1 - (fileBuffer.length / file.size)) * 100).toFixed(1);

          return NextResponse.json(
            {
              success: false,
              error: `PDF is too large even after compression (${compressedSizeKB}KB). Maximum allowed: ${targetSizeKB}KB. Please use a smaller file.`,
              suggestion: 'Try these solutions:\n1. Use ilovepdf.com or smallpdf.com to compress\n2. Convert scanned images to black & white\n3. Reduce image quality/DPI (try 150 DPI instead of 300)\n4. Remove unnecessary pages\n5. Save as "Reduced Size PDF" in Adobe Acrobat',
              originalSize: originalSizeKB,
              compressedSize: compressedSizeKB,
              targetSize: targetSizeKB,
              reductionPercent: reductionPercent,
              compressionPasses: compressionAttempt
            },
            { status: 400 }
          );
        }
      } catch (compressionError) {
        console.error('❌ PDF compression failed:', compressionError);

        // Provide more specific error messages based on error type
        let errorMessage = 'Failed to compress PDF.';
        let suggestion = 'Please try a different file or compress it manually.';

        if (compressionError.message && compressionError.message.includes('password')) {
          errorMessage = 'PDF appears to be password-protected.';
          suggestion = 'Please remove password protection and try again.';
        } else if (compressionError.message && compressionError.message.includes('corrupt')) {
          errorMessage = 'PDF file appears to be corrupted.';
          suggestion = 'Please try to re-save or recreate the PDF file.';
        } else if (file.size > 1024 * 1024) { // If file is > 1MB
          errorMessage = 'Large PDF files may contain complex content.';
          suggestion = 'Please use an online PDF compressor or reduce image quality.';
        }

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            suggestion: suggestion,
            details: compressionError.message
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
    return ApiResponse.error('Internal server error', 500, error.message);
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