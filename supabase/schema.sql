-- JECRC No-Dues System: Complete Database Schema
-- This script creates all necessary tables and inserts initial data.

-- Step 1: Create Tables

-- Departments Table: Stores all departments that provide clearance.
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  approver_email TEXT, -- Email for staff who approve for this department
  action_url TEXT,     -- URL for student-led actions (e.g., alumni form)
  type TEXT NOT NULL DEFAULT 'approval' CHECK (type IN ('approval', 'student_action'))
);

-- Profiles Table: Extends Supabase's built-in auth.users table with app-specific data.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'approver', 'admin')),
  department_id UUID REFERENCES public.departments(id) -- Links approvers to their department
);

-- Applications Table: Tracks a student's main no-dues application.
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clearance Statuses Table: The core table tracking the status for each department within an application.
CREATE TABLE public.clearance_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT, -- For rejection reasons
  approver_id UUID REFERENCES public.profiles(id), -- Who approved/rejected it
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Insert Initial Data

-- Add standard departments that require staff approval.
INSERT INTO public.departments (name, approver_email, type) VALUES
  ('Library', 'library-head@jecrcu.edu.in', 'approval'),
  ('Accounts', 'accounts-dept@jecrcu.edu.in', 'approval'),
  ('Hostel', 'hostel-warden@jecrcu.edu.in', 'approval');

-- Add the special department that requires student action.
INSERT INTO public.departments (name, action_url, type) VALUES
  ('Alumni Association', 'https://your-university.com/alumni-registration-form', 'student_action');

-- Note: Row Level Security (RLS) policies should be enabled on all tables in the Supabase Dashboard.
