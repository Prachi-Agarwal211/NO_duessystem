-- ============================================================================
-- NO DUES SYSTEM - COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- Drop existing tables if they exist (BE CAREFUL - this will delete all data!)
-- Uncomment these lines only if you want to recreate everything from scratch:
DROP TABLE IF EXISTS no_dues_status CASCADE;
DROP TABLE IF EXISTS no_dues_forms CASCADE;
DROP TABLE IF EXISTS student_data CASCADE;
DROP TABLE IF EXISTS no_dues_reapplication_history CASCADE;
DROP TABLE IF EXISTS no_dues_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;

-- ============================================================================
-- 1. STUDENT_DATA TABLE - Master student database for auto-fill
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration_no TEXT UNIQUE NOT NULL,
    roll_number TEXT,
    enrollment_number TEXT,
    student_name TEXT NOT NULL,
    parent_name TEXT,
    
    -- School/Course/Branch without strict FK for flexibility/import speed
    school_id UUID,
    school TEXT,
    course_id UUID,
    course TEXT,
    branch_id UUID,
    branch TEXT,
    
    -- Contact info
    country_code TEXT DEFAULT '+91',
    contact_no TEXT,
    personal_email TEXT,
    college_email TEXT,
    
    -- Academic details
    admission_year TEXT,
    passing_year TEXT,
    batch TEXT,
    section TEXT,
    semester INTEGER,
    cgpa DECIMAL(4,2),
    
    -- Personal details
    date_of_birth DATE,
    gender TEXT,
    category TEXT,
    blood_group TEXT,
    
    -- Address
    address TEXT,
    city TEXT,
    state TEXT,
    pin_code TEXT,
    
    -- Emergency contact
    emergency_contact_name TEXT,
    emergency_contact_no TEXT,
    
    -- Alumni
    alumni_profile_link TEXT,
    
    -- Link to form if submitted
    form_id UUID,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_student_data_registration_no ON student_data(registration_no);
CREATE INDEX IF NOT EXISTS idx_student_data_roll_number ON student_data(roll_number);
CREATE INDEX IF NOT EXISTS idx_student_data_enrollment_number ON student_data(enrollment_number);
CREATE INDEX IF NOT EXISTS idx_student_data_school_id ON student_data(school_id);
CREATE INDEX IF NOT EXISTS idx_student_data_course_id ON student_data(course_id);
CREATE INDEX IF NOT EXISTS idx_student_data_branch_id ON student_data(branch_id);

-- ============================================================================
-- 2. NO_DUES_FORMS TABLE - Submitted application forms
-- ============================================================================
CREATE TABLE IF NOT EXISTS no_dues_forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration_no TEXT UNIQUE NOT NULL,
    student_name TEXT NOT NULL,
    parent_name TEXT,
    
    -- School/Course/Branch
    school_id UUID,
    school TEXT,
    course_id UUID,
    course TEXT,
    branch_id UUID,
    branch TEXT,
    
    -- Contact
    country_code TEXT DEFAULT '+91',
    contact_no TEXT,
    personal_email TEXT,
    college_email TEXT,
    
    -- Academic
    admission_year TEXT,
    passing_year TEXT,
    
    -- Alumni
    alumni_profile_link TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'completed', 'reapplied')),
    rejection_reason TEXT,
    
    -- Reapplication tracking
    is_reapplication BOOLEAN DEFAULT FALSE,
    reapplication_count INTEGER DEFAULT 0,
    last_reapplied_at TIMESTAMPTZ,
    student_reply_message TEXT,
    
    -- Certificate
    final_certificate_generated BOOLEAN DEFAULT FALSE,
    certificate_url TEXT,
    certificate_generated_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_registration_no ON no_dues_forms(registration_no);
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_status ON no_dues_forms(status);
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_school_id ON no_dues_forms(school_id);

-- ============================================================================
-- 3. NO_DUES_STATUS TABLE - Per-department approval status
-- ============================================================================
CREATE TABLE IF NOT EXISTS no_dues_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    action_at TIMESTAMPTZ,
    action_by TEXT,
    remarks TEXT,
    rejection_reason TEXT,
    student_reply_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(form_id, department_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_no_dues_status_form_id ON no_dues_status(form_id);
CREATE INDEX IF NOT EXISTS idx_no_dues_status_department ON no_dues_status(department_name);
CREATE INDEX IF NOT EXISTS idx_no_dues_status_status ON no_dues_status(status);

-- ============================================================================
-- 4. REAPPLICATION HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS no_dues_reapplication_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
    reapplication_number INTEGER NOT NULL,
    reapplication_reason TEXT,
    student_reply_message TEXT,
    department_responses JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. NO_DUES_MESSAGES TABLE - Chat messages between students and departments
-- ============================================================================
CREATE TABLE IF NOT EXISTS no_dues_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    message TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('student', 'department')),
    sender_name TEXT NOT NULL,
    sender_id TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for chat queries
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_form_id ON no_dues_messages(form_id);
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_department ON no_dues_messages(department_name);
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_created_at ON no_dues_messages(created_at);

-- ============================================================================
-- 6. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE student_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_dues_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_dues_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_dues_reapplication_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_dues_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (full access for admin operations)
CREATE POLICY "Service role full access to student_data" ON student_data FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access to no_dues_forms" ON no_dues_forms FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access to no_dues_status" ON no_dues_status FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access to reapplication_history" ON no_dues_reapplication_history FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access to no_dues_messages" ON no_dues_messages FOR ALL TO service_role USING (true);

-- Allow authenticated read for students (their own data)
CREATE POLICY "Students can read their own form" ON no_dues_forms FOR SELECT TO authenticated 
    USING (registration_no = current_setting('request.jwt.claims', true)::json->>'registration_no');

-- Allow anon read for public config lookup
CREATE POLICY "Anon can read student_data for lookup" ON student_data FOR SELECT TO anon USING (true);

-- ============================================================================
-- DONE! The schema is ready.
-- ============================================================================
