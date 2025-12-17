-- ==========================================
-- DATABASE SCHEMA VERIFICATION
-- Run this in Supabase SQL Editor 
-- to identify what tables/functions are missing
-- ==========================================

DO $$
DECLARE
    table_missing TEXT;
    function_missing TEXT;
    issues_found BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║               DATABASE SCHEMA VERIFICATION REPORT                  ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- Check core tables expected by APIs
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'no_dues_forms' AND table_schema = 'public') THEN
        RAISE NOTICE '❌ MISSING TABLE: no_dues_forms (Main forms table)';
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '✅ TABLE: no_dues_forms exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'no_dues_status' AND table_schema = 'public') THEN
        RAISE NOTICE '❌ MISSING TABLE: no_dues_status (Department clearances)';
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '✅ TABLE: no_dues_status exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'convocation_eligible_students' AND table_schema = 'public') THEN
        RAISE NOTICE '❌ MISSING TABLE: convocation_eligible_students (Convocation database)';
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '✅ TABLE: convocation_eligible_students exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets' AND table_schema = 'public') THEN
        RAISE NOTICE '❌ MISSING TABLE: support_tickets (Support system)';
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '✅ TABLE: support_tickets exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'config_schools' AND table_schema = 'public') THEN
        RAISE NOTICE '❌ MISSING TABLE: config_schools (School configuration)';
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '✅ TABLE: config_schools exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'config_courses' AND table_schema = 'public') THEN
        RAISE NOTICE '❌ MISSING TABLE: config_courses (Course configuration)';
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '✅ TABLE: config_courses exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'config_branches' AND table_schema = 'public') THEN
        RAISE NOTICE '❌ MISSING TABLE: config_branches (Branch configuration)';
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '✅ TABLE: config_branches exists';
    END IF;
    
    -- Check critical functions expected by Admin Dashboard
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_form_statistics' AND routine_schema = 'public') THEN
        RAISE NOTICE '❌ MISSING FUNCTION: get_form_statistics() (Admin dashboard stats)';
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '✅ FUNCTION: get_form_statistics() exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_department_workload' AND routine_schema = 'public') THEN
        RAISE NOTICE '❌ MISSING FUNCTION: get_department_workload() (Department stats)';
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '✅ FUNCTION: get_department_workload() exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'generate_ticket_number' AND routine_schema = 'public') THEN
        RAISE NOTICE '❌ MISSING FUNCTION: generate_ticket_number() (Support tickets)';
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '✅ FUNCTION: generate_ticket_number() exists';
    END IF;
    
    -- Check storage buckets
    DECLARE
        bucket_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO bucket_count 
        FROM storage.buckets 
        WHERE name IN ('no-dues-files', 'alumni-screenshots', 'certificates');
        
        IF bucket_count < 3 THEN
            RAISE NOTICE '❌ MISSING STORAGE BUCKETS: Found % / 3 expected', bucket_count;
            issues_found := TRUE;
        ELSE
            RAISE NOTICE '✅ STORAGE: All 3 buckets exist';
        END IF;
    END;
    
    RAISE NOTICE '';
    
    IF issues_found THEN
        RAISE NOTICE '🔧 IMMEDIATE ACTION REQUIRED:';
        RAISE NOTICE '   1. Run ULTIMATE_DATABASE_SETUP.sql completely in Supabase';
        RAISE NOTICE '   2. This will create all missing tables, functions, and data';
        RAISE NOTICE '   3. Then redeploy application to clear API errors';
        RAISE NOTICE '';
        RAISE NOTICE '⚡ QUICK FIX: Just copy and paste the entire ULTIMATE_DATABASE_SETUP.sql';
        RAISE NOTICE '           into Supabase SQL Editor and execute it.';
    ELSE
        RAISE NOTICE '🎉 All database objects exist! Check other issues:';
        RAISE NOTICE '   • Environment variables in Render';
        RAISE NOTICE '   • API route authentication';
        RAISE NOTICE '   • Network connectivity';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Expected Schema Summary:';
    RAISE NOTICE '   Core Tables: no_dues_forms, no_dues_status, profiles, departments';
    RAISE NOTICE '   Config Tables: config_schools, config_courses, config_branches';
    RAISE NOTICE '   Special Tables: convocation_eligible_students, support_tickets';
    RAISE NOTICE '   Functions: get_form_statistics, get_department_workload';
    RAISE NOTICE '   Storage: no-dues-files, alumni-screenshots, certificates';
    RAISE NOTICE '';
END $$;

-- Additional diagnostic queries (run separately)
SELECT 
    table_name,
    table_type,
    table_comment
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'no_dues_forms', 'no_dues_status', 'profiles', 'departments',
        'config_schools', 'config_courses', 'config_branches',
        'convocation_eligible_students', 'support_tickets'
    )
ORDER BY table_name;