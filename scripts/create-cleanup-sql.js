/**
 * Generate Cleanup SQL Script
 * Creates a SQL script to safely drop all database objects
 */

const fs = require('fs');
const path = require('path');

const CLEANUP_SQL = `-- Complete Database Cleanup Script
-- This script safely removes all database objects
-- WARNING: This will delete all data!

-- Step 1: Drop all triggers
DROP TRIGGER IF EXISTS trigger_initialize_form_status ON public.no_dues_forms;

-- Step 2: Drop all functions (CASCADE removes dependencies)
DROP FUNCTION IF EXISTS public.initialize_form_status_records() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_response_time(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_summary_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_overall_stats() CASCADE;

-- Step 3: Drop all policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || 
                ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Step 4: Drop all indexes
DROP INDEX IF EXISTS public.idx_no_dues_forms_status;
DROP INDEX IF EXISTS public.idx_no_dues_forms_created_at;
DROP INDEX IF EXISTS public.idx_no_dues_status_form_id;
DROP INDEX IF EXISTS public.idx_no_dues_status_department;
DROP INDEX IF EXISTS public.idx_no_dues_status_status;
DROP INDEX IF EXISTS public.idx_audit_log_created_at;
DROP INDEX IF EXISTS public.idx_notifications_form_id;
DROP INDEX IF EXISTS public.idx_profiles_role;

-- Step 5: Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.no_dues_status CASCADE;
DROP TABLE IF EXISTS public.no_dues_status CASCADE;
DROP TABLE IF EXISTS public.no_dues_forms CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Step 6: Drop storage buckets (if you want to recreate them)
-- Note: Storage buckets need to be deleted via Supabase Dashboard

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Cleanup completed. Please verify manually.';
END $$;
`;

const outputPath = path.join(__dirname, '../supabase/cleanup.sql');
fs.writeFileSync(outputPath, CLEANUP_SQL);
console.log('✅ Cleanup SQL script created at: supabase/cleanup.sql');
console.log('\n📝 To use this script:');
console.log('   1. Go to Supabase Dashboard > SQL Editor');
console.log('   2. Copy the contents of supabase/cleanup.sql');
console.log('   3. Execute the script');
console.log('   4. Then run the main schema.sql to recreate everything\n');

