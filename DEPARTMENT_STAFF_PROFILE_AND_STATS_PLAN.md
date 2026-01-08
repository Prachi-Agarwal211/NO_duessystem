# 👤 DEPARTMENT STAFF PROFILE & STATISTICS SYSTEM PLAN

## Executive Summary
This document outlines a comprehensive profile and statistics system for department staff members, integrated with the department distribution analytics. This will allow admins to track individual HOD/staff performance and department staff to see their personal metrics and achievements.

---

## 🎯 OBJECTIVE

Create a **Staff Profile & Performance System** that:
1. Tracks individual staff member activity and performance
2. Shows detailed staff profiles with statistics
3. Provides department-wise staff distribution analytics
4. Enables performance comparison and leaderboards
5. Integrates with existing department analytics

---

## 📊 CURRENT DATABASE STRUCTURE ANALYSIS

### Available Staff Data in `profiles` Table:
```sql
- id (UUID)
- email
- full_name
- role ('department', 'admin')
- department_name (e.g., 'library', 'school_hod')
- school_id (for school-specific staff)
- is_active
- created_at, updated_at
```

### Staff Activity Tracking via `no_dues_status`:
```sql
- action_by_user_id (references profiles.id)
- action_at (timestamp)
- status (approved/rejected)
- department_name
- rejection_reason
```

---

## 🚀 PROPOSED FEATURES

### 1. **ADMIN VIEW: STAFF DIRECTORY & ANALYTICS**

#### **A. Staff Directory Page** (`/admin/staff`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  👥 Staff Directory & Performance                           │
├─────────────────────────────────────────────────────────────┤
│  [Search: Name/Email] [Filter: Department ▼] [Add Staff +]  │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Total Staff  │ │ Active Today │ │ Avg Actions  │       │
│  │     45       │ │     28       │ │   12.5/day   │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📋 Staff List (Sortable Table)                        │ │
│  │ ┌──────┬────────────┬──────────┬────────┬──────────┐ │ │
│  │ │ Name │ Department │ Role     │ Stats  │ Actions  │ │ │
│  │ ├──────┼────────────┼──────────┼────────┼──────────┤ │ │
│  │ │ 👤   │ Library    │ HOD      │ 245    │ [View]   │ │ │
│  │ │ Dr.  │            │          │ forms  │ [Edit]   │ │ │
│  │ │ Sharma│           │          │ 98% ✓  │          │ │ │
│  │ └──────┴────────────┴──────────┴────────┴──────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Staff Table Columns:**
1. **Avatar** - Profile picture or initials
2. **Staff Details** - Name, Email, Department
3. **Role** - Department staff, HOD, Admin
4. **Statistics** - Total processed, Approval rate, Avg time
5. **Last Active** - Last action timestamp
6. **Status** - Active/Inactive badge
7. **Actions** - View Profile, Edit, Deactivate

**Query for Staff List:**
```sql
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.department_name,
  p.role,
  p.is_active,
  COUNT(ns.id) as total_actions,
  COUNT(*) FILTER (WHERE ns.status = 'approved') as approvals,
  COUNT(*) FILTER (WHERE ns.status = 'rejected') as rejections,
  ROUND(COUNT(*) FILTER (WHERE ns.status = 'approved')::numeric / 
        NULLIF(COUNT(ns.id), 0) * 100, 2) as approval_rate,
  AVG(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) as avg_response_hours,
  MAX(ns.action_at) as last_action,
  p.created_at as joined_date
FROM profiles p
LEFT JOIN no_dues_status ns ON p.id = ns.action_by_user_id
WHERE p.role IN ('department', 'admin')
GROUP BY p.id, p.full_name, p.email, p.department_name, p.role, p.is_active, p.created_at
ORDER BY total_actions DESC;
```

---

#### **B. Individual Staff Profile Page** (`/admin/staff/[id]`)

**Detailed Staff Profile with Comprehensive Stats:**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Staff Directory                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  👤 Profile Header                                    │  │
│  │  ┌────────┐                                           │  │
│  │  │  Photo │  Dr. Rajesh Sharma                        │  │
│  │  │  or    │  📧 rajesh.sharma@jecrcu.edu.in          │  │
│  │  │  Avatar│  🏢 Library Department (HOD)              │  │
│  │  └────────┘  ✅ Active • Member since Jan 2024       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────── PERFORMANCE OVERVIEW ──────────────┐ │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │ │ Total    │ │ Approved │ │ Rejected │ │ Pending  │ │ │
│  │ │ Actions  │ │          │ │          │ │ In Queue │ │ │
│  │ │   245    │ │   228    │ │    17    │ │    45    │ │ │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │ │
│  │                                                       │ │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │ │ Approval │ │ Avg Time │ │ Dept Rank│ │ SLA Rate │ │ │
│  │ │ Rate     │ │ Response │ │          │ │          │ │ │
│  │ │  93.1%   │ │ 18.5 hrs │ │  #2/7    │ │  87.2%   │ │ │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────── ACTIVITY TIMELINE ─────────────────┐ │
│  │ 📊 Forms Processed Over Time (Last 30 Days)          │ │
│  │  [Line Chart showing daily activity]                 │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────── DETAILED STATISTICS ───────────────┐ │
│  │                                                        │ │
│  │  📅 Activity Breakdown:                               │ │
│  │  • Forms processed today: 8                           │ │
│  │  • Forms processed this week: 42                      │ │
│  │  • Forms processed this month: 158                    │ │
│  │  • Most active day: Monday (avg 12 forms)            │ │
│  │  • Peak hours: 10 AM - 12 PM                         │ │
│  │                                                        │ │
│  │  ⏱️ Response Time Analysis:                          │ │
│  │  • Fastest response: 2.5 hours                        │ │
│  │  • Slowest response: 72 hours                         │ │
│  │  • Median response: 16 hours                          │ │
│  │  • Within 24 hrs: 85.3% of forms                     │ │
│  │  • Within 48 hrs: 97.2% of forms                     │ │
│  │                                                        │ │
│  │  📈 Performance Trends:                               │ │
│  │  • This month vs last: ↑ 12% faster                  │ │
│  │  • Approval rate trend: ↑ 2.3%                       │ │
│  │  • Forms per day trend: ↑ 1.5 forms                  │ │
│  │                                                        │ │
│  │  🎯 Department Comparison:                            │ │
│  │  • Your avg time: 18.5 hrs                           │ │
│  │  • Dept average: 24.2 hrs                            │ │
│  │  • You are 23.5% faster than average                │ │
│  │                                                        │ │
│  │  🏆 Achievements & Badges:                           │ │
│  │  • ⚡ Speed Demon (100+ forms in 24hrs)              │ │
│  │  • 🎯 Perfect Week (100% approval rate)              │ │
│  │  • 🔥 Hot Streak (15 days active)                    │ │
│  │                                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────── RECENT ACTIVITY ───────────────────┐ │
│  │ Last 20 Actions (Scrollable List)                     │ │
│  │ ┌────────────────────────────────────────────────────┐│ │
│  │ │ ✅ Approved - Rahul Kumar (21BCS001) - 2 hrs ago  ││ │
│  │ │ ❌ Rejected - Priya Singh (21BCS002) - 5 hrs ago  ││ │
│  │ │ ✅ Approved - Amit Patel (21BCS003) - 1 day ago   ││ │
│  │ └────────────────────────────────────────────────────┘│ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [Edit Profile] [Change Department] [View All Actions]     │
└─────────────────────────────────────────────────────────────┘
```

**SQL Query for Individual Staff Stats:**
```sql
-- Main profile stats
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.department_name,
  d.display_name as department_display_name,
  p.role,
  p.is_active,
  p.created_at as joined_date,
  
  -- Overall stats
  COUNT(ns.id) as total_actions,
  COUNT(*) FILTER (WHERE ns.status = 'approved') as total_approved,
  COUNT(*) FILTER (WHERE ns.status = 'rejected') as total_rejected,
  ROUND(COUNT(*) FILTER (WHERE ns.status = 'approved')::numeric / 
        NULLIF(COUNT(ns.id), 0) * 100, 2) as approval_rate,
  
  -- Time stats
  AVG(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) as avg_response_hours,
  MIN(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) as fastest_response_hours,
  MAX(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) as slowest_response_hours,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) as median_response_hours,
  
  -- SLA compliance
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (ns.action_at - ns.created_at)) < 86400) as within_24hrs,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (ns.action_at - ns.created_at)) < 172800) as within_48hrs,
  ROUND(COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (ns.action_at - ns.created_at)) < 172800)::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE ns.action_at IS NOT NULL), 0) * 100, 2) as sla_compliance_rate,
  
  -- Activity breakdown
  COUNT(*) FILTER (WHERE ns.action_at >= CURRENT_DATE) as actions_today,
  COUNT(*) FILTER (WHERE ns.action_at >= CURRENT_DATE - INTERVAL '7 days') as actions_this_week,
  COUNT(*) FILTER (WHERE ns.action_at >= CURRENT_DATE - INTERVAL '30 days') as actions_this_month,
  
  -- Last activity
  MAX(ns.action_at) as last_action_time,
  
  -- Pending queue
  (SELECT COUNT(*) FROM no_dues_status 
   WHERE department_name = p.department_name 
   AND status = 'pending') as pending_in_queue

FROM profiles p
LEFT JOIN departments d ON p.department_name = d.name
LEFT JOIN no_dues_status ns ON p.id = ns.action_by_user_id
WHERE p.id = $1
GROUP BY p.id, p.full_name, p.email, p.department_name, d.display_name, p.role, p.is_active, p.created_at;

-- Activity by day of week
SELECT 
  TO_CHAR(ns.action_at, 'Day') as day_name,
  COUNT(*) as action_count,
  AVG(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) as avg_hours
FROM no_dues_status ns
WHERE ns.action_by_user_id = $1
  AND ns.action_at IS NOT NULL
GROUP BY TO_CHAR(ns.action_at, 'Day'), EXTRACT(DOW FROM ns.action_at)
ORDER BY EXTRACT(DOW FROM ns.action_at);

-- Activity by hour of day
SELECT 
  EXTRACT(HOUR FROM ns.action_at) as hour,
  COUNT(*) as action_count
FROM no_dues_status ns
WHERE ns.action_by_user_id = $1
  AND ns.action_at IS NOT NULL
GROUP BY EXTRACT(HOUR FROM ns.action_at)
ORDER BY hour;

-- Recent activity (last 20)
SELECT 
  ns.id,
  ns.status,
  ns.action_at,
  nf.student_name,
  nf.registration_no,
  nf.course,
  nf.branch,
  ns.rejection_reason
FROM no_dues_status ns
JOIN no_dues_forms nf ON ns.form_id = nf.id
WHERE ns.action_by_user_id = $1
  AND ns.action_at IS NOT NULL
ORDER BY ns.action_at DESC
LIMIT 20;

-- Department comparison
SELECT 
  AVG(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) as dept_avg_hours,
  ROUND(AVG(CASE WHEN ns.status = 'approved' THEN 1.0 ELSE 0.0 END) * 100, 2) as dept_approval_rate
FROM no_dues_status ns
JOIN profiles p ON ns.action_by_user_id = p.id
WHERE p.department_name = (SELECT department_name FROM profiles WHERE id = $1)
  AND ns.action_at IS NOT NULL;
```

---

#### **C. Department Staff Distribution in Analytics**

**Integration with Department Analytics Page:**

In the existing department analytics, add a **"Staff Members"** section:

```
┌───────────────────────────────────────────────────────────┐
│  📊 Library Department Performance                        │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  [Existing department metrics]                            │
│                                                           │
│  ┌─────────────────── STAFF MEMBERS ────────────────────┐│
│  │                                                       ││
│  │  👥 Total Staff: 3                                   ││
│  │  ✅ Active Today: 2                                  ││
│  │                                                       ││
│  │  ┌──────────────────────────────────────────────────┐││
│  │  │ 👤 Dr. Rajesh Sharma (HOD)                       │││
│  │  │    📊 245 forms | 93.1% approval | 18.5 hrs avg  │││
│  │  │    [View Profile]                                │││
│  │  ├──────────────────────────────────────────────────┤││
│  │  │ 👤 Mrs. Anita Verma                              │││
│  │  │    📊 198 forms | 95.2% approval | 21.3 hrs avg  │││
│  │  │    [View Profile]                                │││
│  │  ├──────────────────────────────────────────────────┤││
│  │  │ 👤 Mr. Suresh Kumar                              │││
│  │  │    📊 156 forms | 91.8% approval | 25.1 hrs avg  │││
│  │  │    [View Profile]                                │││
│  │  └──────────────────────────────────────────────────┘││
│  │                                                       ││
│  └───────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────┘
```

**Query for Department Staff:**
```sql
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role,
  COUNT(ns.id) as total_actions,
  COUNT(*) FILTER (WHERE ns.status = 'approved') as approvals,
  COUNT(*) FILTER (WHERE ns.status = 'rejected') as rejections,
  ROUND(COUNT(*) FILTER (WHERE ns.status = 'approved')::numeric / 
        NULLIF(COUNT(ns.id), 0) * 100, 2) as approval_rate,
  AVG(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) as avg_hours,
  MAX(ns.action_at) as last_active
FROM profiles p
LEFT JOIN no_dues_status ns ON p.id = ns.action_by_user_id
WHERE p.department_name = $1
  AND p.role = 'department'
  AND p.is_active = true
GROUP BY p.id, p.full_name, p.email, p.role
ORDER BY total_actions DESC;
```

---

### 2. **DEPARTMENT STAFF VIEW: PERSONAL PROFILE & STATS**

#### **A. Personal Dashboard Enhancement** (`/staff/dashboard`)

**Add "My Profile & Stats" Card at the top:**

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Library Dashboard                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────── MY PERFORMANCE ────────────────────┐ │
│  │  👤 Dr. Rajesh Sharma                                 │ │
│  │  🏢 Library Department (HOD)                          │ │
│  │                                                        │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│ │
│  │  │ Today    │ │ This Week│ │ This Month│ │ All Time ││ │
│  │  │    8     │ │    42    │ │   158     │ │   245    ││ │
│  │  │ actions  │ │ actions  │ │ actions   │ │ actions  ││ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│ │
│  │                                                        │ │
│  │  🏆 Rank: #2 of 7 departments                        │ │
│  │  ⚡ Avg Response: 18.5 hrs (Dept Avg: 24.2 hrs)      │ │
│  │  ✅ Approval Rate: 93.1% (Dept Avg: 88.5%)           │ │
│  │  🎯 SLA Compliance: 87.2%                             │ │
│  │                                                        │ │
│  │  [View Full Profile & Stats]                          │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [Existing dashboard content]                              │
└─────────────────────────────────────────────────────────────┘
```

---

#### **B. Full Staff Profile Page** (`/staff/profile`)

**Dedicated profile page for department staff (similar to admin view but self-focused):**

```
┌─────────────────────────────────────────────────────────────┐
│  👤 My Profile & Performance Dashboard                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Same layout as admin's staff profile view, but for self] │
│                                                             │
│  Additional Features:                                       │
│  • 🎯 Personal Goals & Targets                             │
│  • 📊 Performance Comparison with Peers                    │
│  • 🏆 Badges & Achievements                                │
│  • 📅 Activity Calendar (heatmap)                          │
│  • 📈 Monthly Performance Reports (downloadable)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. **LEADERBOARD & RANKINGS**

#### **Global Staff Leaderboard** (Admin View)

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 Staff Performance Leaderboard                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Time Period: This Month ▼] [Sort By: Fastest Response ▼] │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Rank │ Staff Member        │ Dept    │ Stats         │ │
│  ├──────┼─────────────────────┼─────────┼───────────────┤ │
│  │ 🥇 1 │ Dr. Rajesh Sharma   │ Library │ 18.5 hrs avg  │ │
│  │      │                     │         │ 93.1% ✓       │ │
│  ├──────┼─────────────────────┼─────────┼───────────────┤ │
│  │ 🥈 2 │ Prof. Sunita Gupta  │ Hostel  │ 19.2 hrs avg  │ │
│  │      │                     │         │ 91.5% ✓       │ │
│  ├──────┼─────────────────────┼─────────┼───────────────┤ │
│  │ 🥉 3 │ Dr. Amit Verma      │ IT Dept │ 20.1 hrs avg  │ │
│  │      │                     │         │ 94.8% ✓       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Leaderboard Categories:                                    │
│  • ⚡ Fastest Response Time                                 │
│  • ✅ Highest Approval Rate                                 │
│  • 📊 Most Forms Processed                                  │
│  • 🎯 Best SLA Compliance                                   │
│  • 🔥 Most Consistent (active days)                         │
└─────────────────────────────────────────────────────────────┘
```

**Query for Leaderboard:**
```sql
WITH staff_stats AS (
  SELECT 
    p.id,
    p.full_name,
    p.department_name,
    d.display_name as dept_display,
    COUNT(ns.id) as total_actions,
    ROUND(COUNT(*) FILTER (WHERE ns.status = 'approved')::numeric / 
          NULLIF(COUNT(ns.id), 0) * 100, 2) as approval_rate,
    AVG(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) as avg_hours,
    COUNT(DISTINCT DATE(ns.action_at)) as active_days
  FROM profiles p
  JOIN departments d ON p.department_name = d.name
  LEFT JOIN no_dues_status ns ON p.id = ns.action_by_user_id
  WHERE p.role = 'department'
    AND p.is_active = true
    AND ns.action_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY p.id, p.full_name, p.department_name, d.display_name
)
SELECT 
  *,
  RANK() OVER (ORDER BY avg_hours ASC) as speed_rank,
  RANK() OVER (ORDER BY approval_rate DESC) as approval_rank,
  RANK() OVER (ORDER BY total_actions DESC) as volume_rank,
  RANK() OVER (ORDER BY active_days DESC) as consistency_rank
FROM staff_stats
ORDER BY speed_rank;
```

---

### 4. **ACHIEVEMENTS & GAMIFICATION**

#### **Badge System for Staff Members**

**Achievement Badges:**

1. **⚡ Speed Demon**
   - Condition: Process 100+ forms with avg response < 12 hours
   - Award: Gold badge

2. **🎯 Perfectionist**
   - Condition: 100% approval rate for 50+ consecutive forms
   - Award: Diamond badge

3. **🔥 Hot Streak**
   - Condition: Active for 30 consecutive days
   - Award: Fire badge

4. **📊 Volume King**
   - Condition: Process 500+ forms in a month
   - Award: Crown badge

5. **🏆 Department Champion**
   - Condition: #1 in department for 3 consecutive months
   - Award: Trophy badge

6. **⏰ Early Bird**
   - Condition: Process 80%+ forms before 10 AM
   - Award: Sunrise badge

7. **🌙 Night Owl**
   - Condition: Process 50%+ forms after 6 PM
   - Award: Moon badge

8. **🎓 Scholar**
   - Condition: Review forms from all courses/branches
   - Award: Graduation cap badge

**Query for Badge Calculation:**
```sql
-- Speed Demon Check
SELECT 
  p.id,
  COUNT(ns.id) as total,
  AVG(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) as avg_hours
FROM profiles p
JOIN no_dues_status ns ON p.id = ns.action_by_user_id
WHERE p.role = 'department'
GROUP BY p.id
HAVING COUNT(ns.id) >= 100 AND AVG(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) < 12;

-- Hot Streak Check
SELECT 
  p.id,
  COUNT(DISTINCT DATE(ns.action_at)) as active_days,
  MAX(DATE(ns.action_at)) - MIN(DATE(ns.action_at)) as day_span
FROM profiles p
JOIN no_dues_status ns ON p.id = ns.action_by_user_id
WHERE p.role = 'department'
  AND ns.action_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.id
HAVING COUNT(DISTINCT DATE(ns.action_at)) >= 30;
```

---

### 5. **DATABASE ADDITIONS NEEDED**

#### **A. New Table: `staff_achievements`**

```sql
CREATE TABLE public.staff_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(staff_id, badge_type)
);

CREATE INDEX idx_achievements_staff ON public.staff_achievements(staff_id);
CREATE INDEX idx_achievements_type ON public.staff_achievements(badge_type);
```

#### **B. New Table: `staff_activity_log`**

```sql
CREATE TABLE public.staff_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'login', 'approve', 'reject', 'bulk_action'
  form_id UUID REFERENCES public.no_dues_forms(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_staff ON public.staff_activity_log(staff_id);
CREATE INDEX idx_activity_date ON public.staff_activity_log(DATE(created_at));
```

#### **C. Extended `profiles` Table**

Add new columns to existing `profiles` table:
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
```

#### **D. Materialized View: `staff_performance_summary`**

```sql
CREATE MATERIALIZED VIEW public.staff_performance_summary AS
SELECT 
  p.id as staff_id,
  p.full_name,
  p.email,
  p.department_name,
  d.display_name as department_display,
  COUNT(ns.id) as total_actions,
  COUNT(*) FILTER (WHERE ns.status = 'approved') as total_approved,
  COUNT(*) FILTER (WHERE ns.status = 'rejected') as total_rejected,
  COUNT(*) FILTER (WHERE ns.action_at >= CURRENT_DATE) as today_actions,
  COUNT(*) FILTER (WHERE ns.action_at >= CURRENT_DATE - INTERVAL '7 days') as week_actions,
  COUNT(*) FILTER (WHERE ns.action_at >= CURRENT_DATE - INTERVAL '30 days') as month_actions,
  ROUND(COUNT(*) FILTER (WHERE ns.status = 'approved')::numeric / 
        NULLIF(COUNT(ns.id), 0) * 100, 2) as approval_rate,
  AVG(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) as avg_response_hours,
  MAX(ns.action_at) as last_action,
  COUNT(DISTINCT DATE(ns.action_at)) as active_days,
  RANK() OVER (ORDER BY AVG(EXTRACT(EPOCH FROM (ns.action_at - ns.created_at))/3600) ASC) as speed_rank,
  RANK() OVER (ORDER BY COUNT(ns.id) DESC) as volume_rank
FROM profiles p
LEFT JOIN departments d ON p.department_name = d.name
LEFT JOIN no_dues_status ns ON p.id = ns.action_by_user_id
WHERE p.role IN ('department', 'admin')
GROUP BY p.id, p.full_name, p.email, p.department_name, d.display_name;

-- Refresh policy: Every 5 minutes
CREATE INDEX idx_staff_perf_id ON public.staff_performance_summary(staff_id);
CREATE INDEX idx_staff_perf_dept ON public.staff_performance_summary(department_name);
```

---

### 6. **API ENDPOINTS TO CREATE**

```javascript
// Admin Staff Management
GET  /api/admin/staff                    // List all staff with stats
GET  /api/admin/staff/[id]               // Individual staff profile
POST /api/admin/staff                    // Create new staff account
PUT  /api/admin/staff/[id]               // Update staff profile
DELETE /api/admin/staff/[id]             // Deactivate staff

// Admin Staff Analytics
GET  /api/admin/staff/leaderboard        // Staff rankings
GET  /api/admin/staff/department/[name]  // Staff in specific department
GET  /api/admin/staff/[id]/activity      // Individual activity log
GET  /api/admin/staff/[id]/timeline      // Activity timeline chart data

// Staff Self-Service
GET  /api/staff/profile                  // Own profile & stats
PUT  /api/staff/profile                  // Update own profile
GET  /api/staff/profile/achievements     // Own badges
GET  /api/staff/profile/performance      // Detailed performance metrics
GET  /api/staff/profile/activity         // Own activity log
GET  /api/staff/profile/comparison       // Compare with peers

// Badges & Achievements
GET  /api/staff/badges/available         // All badge types
GET  /api/staff/badges/earned            // User's earned badges
POST /api/admin/staff/[id]/award-badge   // Manual badge award (admin)
```

---

### 7. **UI COMPONENTS TO BUILD**

1. **`StaffCard`** - Compact staff info card
2. **`StaffTable`** - Sortable/filterable table
3. **`StaffProfileHeader`** - Profile hero section
4. **`PerformanceMetrics`** - Stats grid
5. **`ActivityTimeline`** - Chronological activity feed
6. **`ActivityChart`** - Line/bar charts for trends
7. **`BadgeDisplay`** - Achievement badges showcase
8. **`LeaderboardTable`** - Ranking table
9. **`ComparisonCard`** - Self vs department comparison
10. **`StaffAvatar`** - Profile picture or initials

---

### 8. **IMPLEMENTATION PHASES**

#### **Phase 1: Database & Backend (Week 1)**
- ✅ Add new tables (staff_achievements, staff_activity_log)
- ✅ Extend profiles table with new columns
- ✅ Create materialized view for performance
- ✅ Build all API endpoints
- ✅ Write comprehensive queries

#### **Phase 2: Admin Staff Management (Week 2)**
- ✅ Staff directory page
- ✅ Individual staff profile page
- ✅ Staff CRUD operations
- ✅ Activity logs and timeline
- ✅ Leaderboard page

#### **Phase 3: Department Staff Features (Week 2)**
- ✅ Personal dashboard enhancement
- ✅ Full profile page for staff
- ✅ Performance comparison
- ✅ Activity charts and analytics

#### **Phase 4: Gamification (Week 3)**
- ✅ Badge system implementation
- ✅ Achievement tracking
- ✅ Badge awarding logic
- ✅ Badge display UI

#### **Phase 5: Integration & Polish (Week 3)**
- ✅ Integrate with department analytics
- ✅ Add staff sections to existing pages
- ✅ Real-time updates
- ✅ Testing and optimization

---

### 9. **SECURITY & PRIVACY**

1. **Access Control**
   - Admin: Full access to all staff profiles
   - Department Staff: Read-only access to own profile
   - Students: No access to staff data

2. **Data Privacy**
   - Hide sensitive fields (phone, personal email) from leaderboards
   - Anonymize data in public comparisons
   - Audit log all profile access

3. **RLS Policies**
```sql
-- Staff can view own profile
CREATE POLICY "Staff view own profile" ON public.profiles 
FOR SELECT USING (id = auth.uid() AND role = 'department');

-- Admin view all staff
CREATE POLICY "Admin view all staff" ON public.profiles 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Achievements viewable by owner and admin
CREATE POLICY "View own achievements" ON public.staff_achievements
FOR SELECT USING (
  staff_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
```

---

### 10. **PERFORMANCE OPTIMIZATION**

1. **Caching Strategy**
   - Cache staff performance summary: 5-minute TTL
   - Cache leaderboard: 10-minute TTL
   - Cache individual profiles: 2-minute TTL

2. **Database Optimization**
   - Use materialized view for heavy aggregations
   - Refresh materialized view every 5 minutes via cron
   - Index all foreign keys and frequently queried columns

3. **Query Optimization**
   - Use CTEs for complex queries
   - Avoid N+1 queries with JOINs
   - Paginate large result sets

---

## ✅ ACCEPTANCE CRITERIA

- [ ] Admin can view list of all staff with basic stats
- [ ] Admin can view detailed profile of any staff member
- [ ] Admin can see staff distribution within each department
- [ ] Staff can view their own detailed profile and stats
- [ ] Staff can see performance comparison with peers
- [ ] Leaderboard shows top performing staff
- [ ] Achievement badges are automatically awarded
- [ ] Activity timeline shows chronological actions
- [ ] Real-time stats update on actions
- [ ] Export staff reports to CSV/PDF
- [ ] Mobile responsive design
- [ ] Performance: Page load < 2 seconds

---

## 🎉 CONCLUSION

This comprehensive Staff Profile & Statistics System provides:

✅ **Complete Staff Visibility** - Admin sees all staff performance  
✅ **Individual Accountability** - Track each staff member's contributions  
✅ **Performance Gamification** - Badges and leaderboards motivate staff  
✅ **Self-Service Profiles** - Staff monitor their own progress  
✅ **Department Integration** - Staff data integrated with department analytics  
✅ **Data-Driven Insights** - Identify top performers and improvement areas  

**Total Development Time: 3 weeks**  
**Works seamlessly with existing Department Distribution Analytics**