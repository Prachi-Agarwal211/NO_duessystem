-- ============================================================================
-- DATABASE SCHEMA FIXES - NO DUES SYSTEM
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- Fix 1: Add missing last_active_at column to profiles table
-- This fixes the error: "column profiles.last_active_at does not exist"
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Fix 2: Add missing student_email column to support_tickets table
-- This fixes support ticket creation issues
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS student_email TEXT;

-- Fix 3: Disable maintenance mode to allow student access
UPDATE system_settings 
SET value = 'false'::jsonb 
WHERE key = 'maintenance_mode';

-- Verify the fixes
SELECT 
    'profiles.last_active_at' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'last_active_at'
        ) THEN '✅ ADDED'
        ELSE '❌ MISSING'
    END as status;

SELECT 
    'support_tickets.student_email' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_tickets' AND column_name = 'student_email'
        ) THEN '✅ ADDED'
        ELSE '❌ MISSING'
    END as status;

SELECT 
    'maintenance_mode' as setting,
    CASE 
        WHEN value = 'false' THEN '✅ DISABLED (Students can access)'
        ELSE '⚠️ ENABLED (Students blocked)'
    END as status
FROM system_settings 
WHERE key = 'maintenance_mode';
