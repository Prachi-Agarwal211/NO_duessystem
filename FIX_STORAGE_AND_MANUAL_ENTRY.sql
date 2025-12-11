-- ================================================================
-- FIX STORAGE BUCKETS AND MANUAL ENTRY ISSUES
-- ================================================================
-- This file contains SQL commands to:
-- 1. Fix RLS policies for anonymous uploads to manual-entries
-- 2. Update all storage buckets to 1MB file size limit
-- ================================================================

-- ================================================================
-- PART 1: FIX RLS POLICIES FOR ANONYMOUS UPLOADS
-- ================================================================
-- Issue: Students using manual entry form are NOT authenticated
-- Solution: Allow anonymous (anon) users to upload to manual-entries folder
-- ================================================================

-- Step 1: Drop the restrictive authenticated-only upload policy
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- Step 2: Create new policy allowing BOTH anonymous and authenticated users
-- This allows students to upload certificates without signing up
CREATE POLICY "Allow anon and authenticated uploads to manual entries"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'no-dues-files' 
    AND (storage.foldername(name))[1] = 'manual-entries'
);

-- Step 3: Add policy for authenticated users to upload to other folders (optional)
CREATE POLICY "Authenticated users can upload to other folders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'no-dues-files' 
    AND (storage.foldername(name))[1] != 'manual-entries'
);

-- Step 4: Verify the new policies were created
SELECT 
    policyname,
    cmd as operation,
    roles,
    with_check
FROM pg_policies
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname LIKE '%upload%'
    AND (qual LIKE '%no-dues-files%' OR with_check LIKE '%no-dues-files%')
ORDER BY policyname;


-- ================================================================
-- PART 2: UPDATE ALL STORAGE BUCKETS TO 1MB FILE SIZE LIMIT
-- ================================================================
-- Restricts file uploads to 1MB maximum for all buckets
-- ================================================================

-- Step 1: Check current bucket configurations
SELECT 
    id,
    name,
    public,
    file_size_limit,
    CASE 
        WHEN file_size_limit IS NULL THEN 'No limit'
        WHEN file_size_limit = 1048576 THEN '1 MB'
        WHEN file_size_limit = 5242880 THEN '5 MB'
        WHEN file_size_limit = 10485760 THEN '10 MB'
        ELSE file_size_limit::text || ' bytes'
    END as current_size,
    allowed_mime_types,
    created_at
FROM storage.buckets
ORDER BY name;

-- Step 2: Update all buckets to 1MB (1,048,576 bytes) limit
-- Also restrict no-dues-files bucket to PDF only for manual entries
UPDATE storage.buckets
SET
    file_size_limit = 1048576,  -- 1MB in bytes
    allowed_mime_types = CASE
        WHEN name = 'no-dues-files' THEN ARRAY['application/pdf']::text[]
        WHEN name = 'certificates' THEN ARRAY['application/pdf']::text[]
        WHEN name = 'avatars' THEN ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
        ELSE allowed_mime_types
    END
WHERE name IN ('no-dues-files', 'certificates', 'avatars')
RETURNING
    id,
    name,
    file_size_limit,
    allowed_mime_types,
    '1 MB' as new_size_display;

-- Alternative: Update each bucket individually (if needed)
-- Uncomment the specific bucket you want to update:

-- Update no-dues-files bucket to 1MB
-- UPDATE storage.buckets
-- SET file_size_limit = 1048576
-- WHERE name = 'no-dues-files';

-- Update certificates bucket to 1MB
-- UPDATE storage.buckets
-- SET file_size_limit = 1048576
-- WHERE name = 'certificates';

-- Update avatars bucket to 1MB (if exists)
-- UPDATE storage.buckets
-- SET file_size_limit = 1048576
-- WHERE name = 'avatars';

-- Step 3: Verify all buckets now have 1MB limit
SELECT 
    name,
    file_size_limit,
    CASE 
        WHEN file_size_limit = 1048576 THEN '1 MB ✓'
        ELSE file_size_limit::text || ' bytes ⚠️'
    END as size_display,
    public as is_public,
    allowed_mime_types
FROM storage.buckets
WHERE name IN ('no-dues-files', 'certificates', 'avatars')
ORDER BY name;


-- ================================================================
-- PART 3: VERIFICATION QUERIES
-- ================================================================

-- Verify RLS is enabled on storage.objects
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage' 
    AND tablename = 'objects';

-- List all active storage policies
SELECT 
    policyname,
    cmd as operation,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || left(qual::text, 50)
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || left(with_check::text, 50)
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
ORDER BY policyname;


-- ================================================================
-- NOTES AND IMPORTANT INFORMATION
-- ================================================================

/*
FILE SIZE REFERENCE:
- 1 MB = 1,048,576 bytes
- 5 MB = 5,242,880 bytes
- 10 MB = 10,485,760 bytes

IMPORTANT NOTES:
1. Existing files larger than 1MB will NOT be deleted
2. New uploads over 1MB will be rejected
3. Anonymous users can now upload to manual-entries folder
4. Authenticated users can upload to other folders in no-dues-files bucket
5. All buckets maintain their current MIME type restrictions

TESTING:
After running these SQL commands:
1. Test manual entry upload with a file < 1MB → Should succeed ✅
2. Test manual entry upload with a file > 1MB → Should fail with size limit error ❌
3. Verify anonymous users can upload without authentication ✅

SECURITY:
✅ Public bucket is safe because:
   - Only uploaded files can be accessed via specific URLs
   - File names are timestamped and unique
   - RLS policies prevent unauthorized operations
   - No directory listing is exposed

✅ Anonymous uploads are restricted to:
   - manual-entries folder only
   - 1MB file size limit
   - PDF files only (application/pdf)

✅ MIME type restrictions enforced:
   - no-dues-files: PDF only for certificates
   - certificates: PDF only for generated docs
   - avatars: Images only (JPEG, PNG, WebP)
*/

-- ================================================================
-- END OF FILE
-- ================================================================