-- =====================================================
-- STAFF PROFILE & STATISTICS SYSTEM
-- Database Migration Script
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create staff_achievements table for gamification
CREATE TABLE IF NOT EXISTS public.staff_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(staff_id, badge_type)
);

-- Enable RLS
ALTER TABLE public.staff_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_achievements
CREATE POLICY "Staff can view own achievements" 
  ON public.staff_achievements FOR SELECT 
  USING (staff_id = auth.uid());

CREATE POLICY "Admin can view all achievements" 
  ON public.staff_achievements FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert achievements" 
  ON public.staff_achievements FOR INSERT 
  WITH CHECK (true);

-- Indexes for staff_achievements
CREATE INDEX IF NOT EXISTS idx_achievements_staff_id ON public.staff_achievements(staff_id);
CREATE INDEX IF NOT EXISTS idx_achievements_badge_type ON public.staff_achievements(badge_type);
CREATE INDEX IF NOT EXISTS idx_achievements_earned_at ON public.staff_achievements(earned_at DESC);

-- =====================================================
-- 2. Extend profiles table with new columns
-- =====================================================

-- Add avatar_url column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add designation column (e.g., HOD, Dean, Librarian)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS designation TEXT;

-- Add last_active_at for tracking activity
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Add bio field for profile description
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- =====================================================
-- 3. Create materialized view for staff performance
-- This pre-calculates stats for fast queries
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS public.staff_performance_summary;

CREATE MATERIALIZED VIEW public.staff_performance_summary AS
SELECT 
  p.id as staff_id,
  p.full_name,
  p.email,
  p.department_name,
  d.display_name as department_display,
  p.designation,
  p.avatar_url,
  p.is_active,
  p.created_at as joined_date,
  
  -- Overall counts
  COUNT(ns.id) as total_actions,
  COUNT(*) FILTER (WHERE ns.status = 'approved') as total_approved,
  COUNT(*) FILTER (WHERE ns.status = 'rejected') as total_rejected,
  
  -- Time-based counts
  COUNT(*) FILTER (WHERE ns.action_at >= CURRENT_DATE) as today_actions,
  COUNT(*) FILTER (WHERE ns.action_at >= CURRENT_DATE - INTERVAL '7 days') as week_actions,
  COUNT(*) FILTER (WHERE ns.action_at >= CURRENT_DATE - INTERVAL '30 days') as month_actions,
  
  -- Approval rate
  ROUND(
    COUNT(*) FILTER (WHERE ns.status = 'approved')::numeric / 
    NULLIF(COUNT(ns.id), 0) * 100, 
    2
  ) as approval_rate,
  
  -- Response time metrics (in hours)
  ROUND(AVG(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600)::numeric, 2) as avg_response_hours,
  ROUND(MIN(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600)::numeric, 2) as fastest_response_hours,
  ROUND(MAX(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600)::numeric, 2) as slowest_response_hours,
  
  -- SLA compliance (within 48 hours)
  ROUND(
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (ns.action_at - ns.created_at)) < 172800)::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE ns.action_at IS NOT NULL), 0) * 100, 
    2
  ) as sla_compliance_rate,
  
  -- Activity metrics
  COUNT(DISTINCT DATE(ns.action_at)) as active_days,
  MAX(ns.action_at) as last_action_at

FROM public.profiles p
LEFT JOIN public.departments d ON p.department_name = d.name
LEFT JOIN public.no_dues_status ns ON p.id = ns.action_by_user_id
WHERE p.role IN ('department', 'admin')
GROUP BY p.id, p.full_name, p.email, p.department_name, d.display_name, 
         p.designation, p.avatar_url, p.is_active, p.created_at;

-- Indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_perf_id ON public.staff_performance_summary(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_perf_dept ON public.staff_performance_summary(department_name);
CREATE INDEX IF NOT EXISTS idx_staff_perf_actions ON public.staff_performance_summary(total_actions DESC);
CREATE INDEX IF NOT EXISTS idx_staff_perf_response ON public.staff_performance_summary(avg_response_hours ASC);

-- =====================================================
-- 4. Create function to refresh materialized view
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_staff_performance_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.staff_performance_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Create RPC function to get staff stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_staff_performance(p_staff_id UUID)
RETURNS TABLE (
  staff_id UUID,
  full_name TEXT,
  email TEXT,
  department_name TEXT,
  department_display TEXT,
  designation TEXT,
  avatar_url TEXT,
  is_active BOOLEAN,
  joined_date TIMESTAMPTZ,
  total_actions BIGINT,
  total_approved BIGINT,
  total_rejected BIGINT,
  today_actions BIGINT,
  week_actions BIGINT,
  month_actions BIGINT,
  approval_rate NUMERIC,
  avg_response_hours NUMERIC,
  fastest_response_hours NUMERIC,
  slowest_response_hours NUMERIC,
  sla_compliance_rate NUMERIC,
  active_days BIGINT,
  last_action_at TIMESTAMPTZ,
  department_rank BIGINT,
  global_rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT 
      s.*,
      RANK() OVER (PARTITION BY s.department_name ORDER BY s.total_actions DESC) as dept_rank,
      RANK() OVER (ORDER BY s.total_actions DESC) as global_rank
    FROM public.staff_performance_summary s
  )
  SELECT 
    r.staff_id,
    r.full_name,
    r.email,
    r.department_name,
    r.department_display,
    r.designation,
    r.avatar_url,
    r.is_active,
    r.joined_date,
    r.total_actions,
    r.total_approved,
    r.total_rejected,
    r.today_actions,
    r.week_actions,
    r.month_actions,
    r.approval_rate,
    r.avg_response_hours,
    r.fastest_response_hours,
    r.slowest_response_hours,
    r.sla_compliance_rate,
    r.active_days,
    r.last_action_at,
    r.dept_rank as department_rank,
    r.global_rank
  FROM ranked r
  WHERE r.staff_id = p_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Create RPC function for leaderboard
-- =====================================================

CREATE OR REPLACE FUNCTION get_staff_leaderboard(
  p_sort_by TEXT DEFAULT 'total_actions',
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  staff_id UUID,
  full_name TEXT,
  department_name TEXT,
  department_display TEXT,
  avatar_url TEXT,
  total_actions BIGINT,
  approval_rate NUMERIC,
  avg_response_hours NUMERIC,
  sla_compliance_rate NUMERIC,
  active_days BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (
      ORDER BY 
        CASE p_sort_by
          WHEN 'total_actions' THEN s.total_actions
          WHEN 'approval_rate' THEN s.approval_rate
          WHEN 'active_days' THEN s.active_days
          ELSE s.total_actions
        END DESC,
        CASE p_sort_by
          WHEN 'avg_response_hours' THEN s.avg_response_hours
          ELSE NULL
        END ASC NULLS LAST
    ) as rank,
    s.staff_id,
    s.full_name,
    s.department_name,
    s.department_display,
    s.avatar_url,
    s.total_actions,
    s.approval_rate,
    s.avg_response_hours,
    s.sla_compliance_rate,
    s.active_days
  FROM public.staff_performance_summary s
  WHERE s.is_active = true
    AND s.total_actions > 0
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. Initial refresh of materialized view
-- =====================================================

REFRESH MATERIALIZED VIEW public.staff_performance_summary;

-- =====================================================
-- DONE! Run this script in Supabase SQL Editor
-- =====================================================
