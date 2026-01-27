-- ============================================================================
-- NO DUES SYSTEM - COMPLETE DATABASE FIXES
-- Run this in Supabase SQL Editor to fix all identified issues
-- ============================================================================

-- ============================================================================
-- 1. FIX CHAT SYSTEM - Ensure no_dues_messages table has correct structure
-- ============================================================================

-- First, check if no_dues_messages table exists and has correct columns
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'no_dues_messages') THEN
        CREATE TABLE no_dues_messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
            department_name TEXT NOT NULL,
            message TEXT NOT NULL,
            sender_type TEXT NOT NULL CHECK (sender_type IN ('student', 'department')),
            sender_name TEXT NOT NULL,
            sender_id TEXT,  -- Polymorphic: can be UUID, string, or null
            is_read BOOLEAN DEFAULT FALSE,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_no_dues_messages_form_id ON no_dues_messages(form_id);
        CREATE INDEX idx_no_dues_messages_department ON no_dues_messages(department_name);
        CREATE INDEX idx_no_dues_messages_created_at ON no_dues_messages(created_at);
        
        RAISE NOTICE 'Created no_dues_messages table';
    ELSE
        RAISE NOTICE 'no_dues_messages table already exists';
    END IF;
END $$;

-- Ensure all required columns exist in no_dues_messages
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check and add sender_id column if missing
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_messages' AND column_name = 'sender_id'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE no_dues_messages ADD COLUMN sender_id TEXT;
        RAISE NOTICE 'Added sender_id column to no_dues_messages';
    END IF;
    
    -- Check and add is_read column if missing
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_messages' AND column_name = 'is_read'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE no_dues_messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_read column to no_dues_messages';
    END IF;
    
    -- Check and add read_at column if missing
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_messages' AND column_name = 'read_at'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE no_dues_messages ADD COLUMN read_at TIMESTAMPTZ;
        RAISE NOTICE 'Added read_at column to no_dues_messages';
    END IF;
END $$;

-- ============================================================================
-- 2. FIX REAPPLICATION SYSTEM - Add missing columns to no_dues_status
-- ============================================================================

DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check and add rejection_count column if missing
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_status' AND column_name = 'rejection_count'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE no_dues_status ADD COLUMN rejection_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added rejection_count column to no_dues_status';
    END IF;
    
    -- Check and add action_by_user_id column if missing
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_status' AND column_name = 'action_by_user_id'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE no_dues_status ADD COLUMN action_by_user_id TEXT;
        RAISE NOTICE 'Added action_by_user_id column to no_dues_status';
    END IF;
END $$;

-- ============================================================================
-- 3. CREATE STUDENT_OTP_LOGS TABLE (Missing from schema)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_otp_logs') THEN
        CREATE TABLE student_otp_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            registration_no TEXT NOT NULL,
            email TEXT NOT NULL,
            otp_code TEXT NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            attempts INTEGER DEFAULT 0,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_student_otp_logs_registration_no ON student_otp_logs(registration_no);
        CREATE INDEX idx_student_otp_logs_email ON student_otp_logs(email);
        CREATE INDEX idx_student_otp_logs_created_at ON student_otp_logs(created_at);
        
        RAISE NOTICE 'Created student_otp_logs table';
    ELSE
        RAISE NOTICE 'student_otp_logs table already exists';
    END IF;
END $$;

-- ============================================================================
-- 4. FIX PROFILES TABLE - Add missing columns
-- ============================================================================

DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check and add last_active_at column if missing
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'last_active_at'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMPTZ;
        RAISE NOTICE 'Added last_active_at column to profiles';
    END IF;
    
    -- Check and add assigned_department_ids column if missing
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'assigned_department_ids'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE profiles ADD COLUMN assigned_department_ids UUID[] DEFAULT '{}';
        RAISE NOTICE 'Added assigned_department_ids column to profiles';
    END IF;
END $$;

-- ============================================================================
-- 5. ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE IF EXISTS no_dues_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_otp_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role full access to no_dues_messages" ON no_dues_messages;
DROP POLICY IF EXISTS "Service role full access to student_otp_logs" ON student_otp_logs;
DROP POLICY IF EXISTS "Allow authenticated to read messages" ON no_dues_messages;
DROP POLICY IF EXISTS "Allow authenticated to insert messages" ON no_dues_messages;

-- Create service role policies
CREATE POLICY "Service role full access to no_dues_messages" 
    ON no_dues_messages FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access to student_otp_logs" 
    ON student_otp_logs FOR ALL TO service_role USING (true);

-- Allow authenticated users to read messages for their forms
CREATE POLICY "Allow authenticated to read messages" 
    ON no_dues_messages FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM no_dues_forms 
        WHERE no_dues_forms.id = no_dues_messages.form_id
    ));

-- Allow authenticated users to insert messages
CREATE POLICY "Allow authenticated to insert messages" 
    ON no_dues_messages FOR INSERT TO authenticated 
    WITH CHECK (true);

-- ============================================================================
-- 6. CREATE OR REPLACE VIEW FOR CHAT MESSAGES (Optional but recommended)
-- ============================================================================

DROP VIEW IF EXISTS no_dues_messages_view;

CREATE VIEW no_dues_messages_view AS
SELECT 
    m.*,
    CASE 
        WHEN m.sender_type = 'department' THEN (
            SELECT jsonb_build_object(
                'id', p.id,
                'full_name', p.full_name,
                'email', p.email,
                'role', p.role
            )
            FROM profiles p
            WHERE p.id = m.sender_id::uuid
        )
        ELSE NULL
    END as sender
FROM no_dues_messages m;

-- Grant permissions on view
GRANT SELECT ON no_dues_messages_view TO anon, authenticated, service_role;

-- ============================================================================
-- 7. VERIFY ALL FIXES
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    column_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE FIX VERIFICATION';
    RAISE NOTICE '========================================';
    
    -- Count tables
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('no_dues_messages', 'student_otp_logs', 'no_dues_forms', 'no_dues_status', 'profiles');
    
    RAISE NOTICE 'Required tables: %', table_count;
    
    -- Count columns in no_dues_messages
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'no_dues_messages';
    
    RAISE NOTICE 'Columns in no_dues_messages: %', column_count;
    
    -- Count columns in no_dues_status
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'no_dues_status';
    
    RAISE NOTICE 'Columns in no_dues_status: %', column_count;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ALL FIXES APPLIED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================