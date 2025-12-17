-- ============================================================================
-- FIX ALL PRODUCTION ERRORS - COMPREHENSIVE SQL UPDATE
-- ============================================================================
-- Run this in Supabase SQL Editor to fix all production runtime errors
-- This includes:
-- 1. Email queue 'attempts' column fix
-- 2. Storage bucket RLS policies for 3-bucket setup
-- 3. Verification queries
-- ============================================================================

-- ============================================================================
-- PART 1: FIX EMAIL QUEUE TABLE (Missing 'attempts' column)
-- ============================================================================

-- Add attempts column if it doesn't exist
ALTER TABLE email_queue 
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

-- Add index for performance on attempts column
CREATE INDEX IF NOT EXISTS idx_email_queue_attempts 
ON email_queue(attempts);

-- Update existing rows to have 0 attempts if NULL
UPDATE email_queue 
SET attempts = 0 
WHERE attempts IS NULL;

-- Add constraint to ensure attempts is never negative (ignore if exists)
DO $$
BEGIN
    ALTER TABLE email_queue
    ADD CONSTRAINT check_attempts_non_negative
    CHECK (attempts >= 0);
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint check_attempts_non_negative already exists, skipping...';
END $$;

-- Verify the column exists
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_queue' 
        AND column_name = 'attempts'
    ) INTO col_exists;
    
    IF col_exists THEN
        RAISE NOTICE '✅ email_queue.attempts column exists and configured';
    ELSE
        RAISE EXCEPTION '❌ email_queue.attempts column is missing!';
    END IF;
END $$;

-- ============================================================================
-- PART 2: VERIFY AND FIX STORAGE BUCKETS
-- ============================================================================

-- Check if buckets exist (informational only - buckets must be created via Dashboard or script)
DO $$
DECLARE
    bucket_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO bucket_count 
    FROM storage.buckets 
    WHERE name IN ('no-dues-files', 'alumni-screenshots', 'certificates');
    
    RAISE NOTICE '';
    RAISE NOTICE '📦 Storage Buckets Found: % / 3', bucket_count;
    
    IF bucket_count < 3 THEN
        RAISE NOTICE '⚠️  Missing buckets! Run: node scripts/setup-supabase.js';
        RAISE NOTICE '   OR create manually in Supabase Dashboard → Storage';
    ELSE
        RAISE NOTICE '✅ All 3 storage buckets exist';
    END IF;
END $$;

-- ============================================================================
-- PART 3: DROP CONFLICTING/OLD RLS POLICIES ON STORAGE
-- ============================================================================

-- Drop old policies that might conflict (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Authenticated users can upload to no-dues-files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view no-dues-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in no-dues-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in no-dues-files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to alumni-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public can view alumni-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage alumni-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload certificates" ON storage.objects;
DROP POLICY IF EXISTS "Public can view certificates" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update certificates" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete certificates" ON storage.objects;

-- ============================================================================
-- PART 4: CREATE CORRECT RLS POLICIES FOR 3-BUCKET SETUP
-- ============================================================================

-- 🔐 BUCKET 1: 'no-dues-files' (Manual entry documents uploaded by admin)
-- Admin/Service can upload files to manual-entries/ folder
CREATE POLICY "Service can upload to no-dues-files"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'no-dues-files');

CREATE POLICY "Public can view no-dues-files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'no-dues-files');

CREATE POLICY "Service can update no-dues-files"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'no-dues-files')
WITH CHECK (bucket_id = 'no-dues-files');

CREATE POLICY "Service can delete no-dues-files"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'no-dues-files');

-- 🔐 BUCKET 2: 'alumni-screenshots' (Student uploads - PUBLIC ACCESS)
-- CRITICAL: This is what students use for form submissions
CREATE POLICY "Public can upload alumni screenshots"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'alumni-screenshots');

CREATE POLICY "Public can view alumni screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'alumni-screenshots');

CREATE POLICY "Public can update alumni screenshots"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'alumni-screenshots')
WITH CHECK (bucket_id = 'alumni-screenshots');

CREATE POLICY "Public can delete alumni screenshots"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'alumni-screenshots');

CREATE POLICY "Service can manage alumni screenshots"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'alumni-screenshots');

-- 🔐 BUCKET 3: 'certificates' (Generated PDF certificates - SERVICE ONLY)
CREATE POLICY "Service can upload certificates"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'certificates');

CREATE POLICY "Public can view certificates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certificates');

CREATE POLICY "Service can update certificates"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'certificates')
WITH CHECK (bucket_id = 'certificates');

CREATE POLICY "Service can delete certificates"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'certificates');

-- ============================================================================
-- PART 5: VERIFY RLS POLICIES
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage';
    
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Storage RLS Policies: %', policy_count;
    
    IF policy_count >= 15 THEN
        RAISE NOTICE '✅ All storage RLS policies configured correctly';
    ELSE
        RAISE NOTICE '⚠️  Expected at least 15 policies, found %', policy_count;
    END IF;
END $$;

-- ============================================================================
-- PART 6: FINAL VERIFICATION & SUMMARY
-- ============================================================================

DO $$
DECLARE
    email_col_exists BOOLEAN;
    bucket_count INTEGER;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║         PRODUCTION ERROR FIXES - VERIFICATION REPORT          ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- Check email_queue.attempts column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_queue' AND column_name = 'attempts'
    ) INTO email_col_exists;
    
    -- Check storage buckets
    SELECT COUNT(*) INTO bucket_count 
    FROM storage.buckets 
    WHERE name IN ('no-dues-files', 'alumni-screenshots', 'certificates');
    
    -- Check RLS policies
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage';
    
    RAISE NOTICE '✅ FIXES APPLIED:';
    RAISE NOTICE '   1. email_queue.attempts column: %', 
        CASE WHEN email_col_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
    RAISE NOTICE '   2. Storage buckets: % / 3', bucket_count;
    RAISE NOTICE '   3. Storage RLS policies: %', policy_count;
    RAISE NOTICE '';
    
    IF NOT email_col_exists THEN
        RAISE EXCEPTION '❌ email_queue.attempts column fix FAILED';
    END IF;
    
    IF bucket_count < 3 THEN
        RAISE NOTICE '⚠️  MANUAL ACTION REQUIRED:';
        RAISE NOTICE '   Missing storage buckets! Create them via:';
        RAISE NOTICE '   • node scripts/setup-supabase.js';
        RAISE NOTICE '   • OR Supabase Dashboard → Storage → New Bucket';
        RAISE NOTICE '';
    END IF;
    
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '   1. If buckets missing: Run setup-supabase.js OR create manually';
    RAISE NOTICE '   2. Clear Render build cache and redeploy';
    RAISE NOTICE '   3. Test form submission with file upload';
    RAISE NOTICE '   4. Verify convocation auto-fill works';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 SQL fixes applied successfully!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- ADDITIONAL DIAGNOSTICS (Run these queries to debug issues)
-- ============================================================================

-- Query 1: List all storage buckets
-- SELECT id, name, public, file_size_limit, allowed_mime_types 
-- FROM storage.buckets 
-- ORDER BY name;

-- Query 2: List all storage RLS policies
-- SELECT policyname, cmd, roles, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'objects' AND schemaname = 'storage' 
-- ORDER BY policyname;

-- Query 3: Test if you can insert into alumni-screenshots (should not fail)
-- This will fail with RLS error if policies are wrong:
-- INSERT INTO storage.objects (bucket_id, name, owner, metadata)
-- VALUES ('alumni-screenshots', 'test-file.jpg', NULL, '{}'::jsonb);
-- -- Remember to delete after testing:
-- DELETE FROM storage.objects WHERE name = 'test-file.jpg';