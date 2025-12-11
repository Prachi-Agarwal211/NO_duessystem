// Secure file upload validation and processing service
// This resolves the security issues identified in the findings

import { createClient } from '@supabase/supabase-js';

// Configure Supabase client for file operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Validates file before upload
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxSize - Maximum file size in bytes (default: 5MB)
 * @param {string[]} options.allowedTypes - Allowed MIME types (default: images only)
 * @returns {Object} - Validation result
 */
export const validateFile = (file, options = {}) => {
    const {
        maxSize = 1 * 1024 * 1024, // 1MB default (updated from 5MB)
        allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    } = options;

    // Check if file exists
    if (!file) {
        throw new Error('No file provided');
    }

    // Check file size
    if (file.size > maxSize) {
        throw new Error(`File size too large. Maximum allowed size is ${Math.round(maxSize / (1024 * 1024))}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
        throw new Error(`File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    // Additional security checks
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
        throw new Error('Invalid file name');
    }

    // Check for potentially dangerous content
    const dangerousPatterns = ['<script', 'javascript:', 'data:'];
    const fileContent = file.name.toLowerCase();
    if (dangerousPatterns.some(pattern => fileContent.includes(pattern))) {
        throw new Error('Potentially dangerous file detected');
    }

    return {
        isValid: true,
        file: file,
        size: file.size,
        type: file.type,
        extension: fileExtension,
        name: file.name
    };
};

/**
 * Sanitizes filename for safe storage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (filename) => {
    // Remove any path traversal attempts
    const sanitized = filename
        .replace(/[\/\\:*?"<>|]/g, '_') // Replace invalid characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .toLowerCase() // Convert to lowercase
        .replace(/[^a-z0-9._-]/g, '') // Keep only safe characters
        .substring(0, 255); // Limit length

    // Ensure it has an extension
    if (!sanitized.includes('.')) {
        throw new Error('File must have an extension');
    }

    return sanitized;
};

/**
 * Generates unique filename to prevent collisions
 * @param {string} originalFilename - Original sanitized filename
 * @param {string} userId - User ID or identifier
 * @param {string} formId - Form ID for context
 * @returns {string} - Unique filename
 */
export const generateUniqueFilename = (originalFilename, userId, formId) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
    const baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.'));

    return `${baseName}_${timestamp}_${randomString}_${formId || userId}${extension}`;
};

/**
 * Uploads file to Supabase storage with security checks
 * @param {File} file - Validated file
 * @param {Object} options - Upload options
 * @param {string} options.userId - User ID for path organization
 * @param {string} options.formId - Form ID for context
 * @param {string} options.bucket - Storage bucket name (default: 'no-dues-files')
 * @returns {Promise<Object>} - Upload result with URL
 */
export const uploadToSupabase = async (file, options = {}) => {
    const {
        userId,
        formId,
        bucket = 'no-dues-files'
    } = options;

    try {
        // Validate inputs
        if (!file) {
            throw new Error('No file provided for upload');
        }

        if (!userId) {
            throw new Error('User ID is required for upload');
        }

        // Create validation result
        const validation = validateFile(file);

        // Sanitize and generate unique filename
        const sanitizedName = sanitizeFilename(validation.name);
        const uniqueFilename = generateUniqueFilename(sanitizedName, userId, formId);

        // Create storage path
        const storagePath = `${userId}/${uniqueFilename}`;

        // Upload to Supabase
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(storagePath);

        return {
            success: true,
            path: storagePath,
            url: publicUrl,
            filename: uniqueFilename,
            size: validation.size,
            type: validation.type
        };

    } catch (error) {
        console.error('File upload error:', error);
        throw new Error(`File upload failed: ${error.message}`);
    }
};

/**
 * Deletes file from Supabase storage
 * @param {string} filePath - Path to file in storage
 * @param {string} bucket - Storage bucket name (default: 'no-dues-files')
 * @returns {Promise<boolean>} - Success status
 */
export const deleteFromSupabase = async (filePath, bucket = 'no-dues-files') => {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            throw new Error(`Delete failed: ${error.message}`);
        }

        return true;
    } catch (error) {
        console.error('File deletion error:', error);
        throw new Error(`File deletion failed: ${error.message}`);
    }
};

/**
 * Validates file upload for alumni screenshot
 * This is a specialized function for the student form use case
 * @param {File} file - File to validate
 * @param {string} userId - User ID
 * @param {string} formId - Form ID
 * @returns {Promise<Object>} - Upload result
 */
export const validateAndUploadAlumniScreenshot = async (file, userId, formId) => {
    // Specific validation for alumni screenshot
    const validation = validateFile(file, {
        maxSize: 1 * 1024 * 1024, // 1MB limit (updated from 5MB)
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    // Upload to Supabase
    const uploadResult = await uploadToSupabase(validation.file, {
        userId: userId,
        formId: formId,
        bucket: 'alumni-screenshots'
    });

    return {
        url: uploadResult.url,
        filename: uploadResult.filename,
        size: uploadResult.size,
        type: uploadResult.type,
        uploadDate: new Date().toISOString()
    };
};

/**
 * Creates upload configuration for frontend
 * @returns {Object} - Frontend upload configuration
 */
export const getUploadConfig = () => {
    return {
        maxFileSize: 1 * 1024 * 1024, // 1MB (updated from 5MB)
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
        bucket: 'no-dues-files',
        // For display purposes
        maxFileSizeDisplay: '1MB',
        allowedTypesDisplay: 'JPEG, PNG, WebP images'
    };
};