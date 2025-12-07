-- =====================================================
-- SUPABASE REALTIME DIAGNOSTIC & FIX SCRIPT
-- =====================================================
-- This script diagnoses and fixes all realtime issues
-- Run in Supabase SQL Editor

-- Step 1: Check if realtime is enabled on tables
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE schemaname = 'public' 
      AND tablename = c.tablename
    ) THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as realtime_status
FROM pg_tables c
WHERE schemaname = 'public' 
  AND tablename IN ('no_dues_forms', 'no_dues_status')
ORDER BY tablename;

-- Step 2: Check replica identity (REQUIRED for realtime UPDATEs)
SELECT 
  schemaname,
  tablename,
  CASE relreplident
    WHEN 'd' THEN '❌ DEFAULT (won''t work for updates)'
    WHEN 'f' THEN '✅ FULL (works for all operations)'
    WHEN 'i' THEN '⚠️ INDEX (limited)'
    WHEN 'n' THEN '❌ NOTHING (won''t work)'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('no_dues_forms', 'no_dues_status');

-- Step 3: Check publication configuration
SELECT 
  pubname,
  schemaname,
  tablename
FROM pg_publication p
JOIN pg_publication_tables pt ON p.pubname = pt.pubname
WHERE schemaname = 'public' 
  AND tablename IN ('no_dues_forms', 'no_dues_status')
ORDER BY tablename;

-- =====================================================
-- FIXES: Run these if any checks show ❌ or ⚠️
-- =====================================================

-- Fix 1: Enable realtime on no_dues_forms
ALTER PUBLICATION supabase_realtime ADD TABLE no_dues_forms;

-- Fix 2: Enable realtime on no_dues_status  
ALTER PUBLICATION supabase_realtime ADD TABLE no_dues_status;

-- Fix 3: Set replica identity to FULL (CRITICAL for UPDATE events)
ALTER TABLE no_dues_forms REPLICA IDENTITY FULL;
ALTER TABLE no_dues_status REPLICA IDENTITY FULL;

-- =====================================================
-- VERIFICATION: Run this after fixes
-- =====================================================

-- Should show both tables with FULL replica identity
SELECT 
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'f' THEN '✅ FULL - Realtime will work'
    ELSE '❌ NOT FULL - Realtime may fail'
  END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('no_dues_forms', 'no_dues_status');

-- Should show both tables in publication
SELECT 
  'no_dues_forms' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE tablename = 'no_dues_forms' 
      AND pubname = 'supabase_realtime'
    ) THEN '✅ In publication'
    ELSE '❌ Not in publication'
  END as status
UNION ALL
SELECT 
  'no_dues_status' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE tablename = 'no_dues_status' 
      AND pubname = 'supabase_realtime'
    ) THEN '✅ In publication'
    ELSE '❌ Not in publication'
  END as status;

-- =====================================================
-- EXPECTED OUTPUT AFTER FIXES:
-- =====================================================
-- table_name       | status
-- -----------------|---------------------------
-- no_dues_forms    | ✅ FULL - Realtime will work
-- no_dues_status   | ✅ FULL - Realtime will work
--
-- table_name       | status
-- -----------------|---------------------------
-- no_dues_forms    | ✅ In publication
-- no_dues_status   | ✅ In publication
-- =====================================================