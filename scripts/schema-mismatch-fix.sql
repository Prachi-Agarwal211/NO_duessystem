-- ============================================================================
-- COMPREHENSIVE SCHEMA FIX - Based on Live Supabase Verification
-- Generated: 2026-01-27
-- Purpose: Fix missing columns and constraints that block certificate & chat
-- ============================================================================
--
-- ISSUES FOUND (from live database check):
-- 1. Missing blockchain columns in no_dues_forms
-- 2. FK constraint on no_dues_messages.sender_id blocking student messages
--
-- ============================================================================

-- ============================================================================
-- PART 1: ADD BLOCKCHAIN COLUMNS TO no_dues_forms
-- These are required by certificateService.js finalizeCertificate()
-- ============================================================================

ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS blockchain_hash TEXT;
ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS blockchain_tx TEXT;
ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS blockchain_block INTEGER;
ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS blockchain_timestamp TIMESTAMPTZ;
ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- PART 2: FIX no_dues_messages TABLE
-- Drop FK constraint and allow TEXT sender_id for students
-- ============================================================================

-- Drop the FK constraint that blocks student messages
ALTER TABLE no_dues_messages DROP CONSTRAINT IF EXISTS no_dues_messages_sender_id_fkey;

-- Change sender_id from UUID to TEXT (allows student names like 'student-REG123')
ALTER TABLE no_dues_messages ALTER COLUMN sender_id TYPE TEXT USING sender_id::TEXT;

-- Make sender_id nullable (for anonymous messages)
ALTER TABLE no_dues_messages ALTER COLUMN sender_id DROP NOT NULL;

-- ============================================================================
-- PART 3: VERIFICATION QUERIES
-- Run these to confirm the fixes worked
-- ============================================================================

-- Check blockchain columns:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'no_dues_forms' AND column_name LIKE 'blockchain_%';

-- Check no_dues_messages columns:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
-- WHERE table_name = 'no_dues_messages' ORDER BY ordinal_position;

-- Test chat insert (should work now):
-- INSERT INTO no_dues_messages (form_id, department_name, message, sender_type, sender_name, sender_id)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'TEST', 'Test', 'student', 'Test User', 'student-TEST001');

-- ============================================================================
-- AFTER RUNNING: Run scripts/test-schema.js to verify all fixes
-- ============================================================================
