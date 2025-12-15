-- ⚡ PERFORMANCE OPTIMIZATION: Database Indexes
-- These indexes optimize the most common dashboard queries

-- ========================================
-- NO_DUES_STATUS TABLE INDEXES
-- ========================================

-- Index for department dashboard filtering (most common query)
-- Used by: Staff dashboard to filter pending items by department
CREATE INDEX IF NOT EXISTS idx_no_dues_status_dept_status_created 
ON no_dues_status(department_name, status, created_at DESC);

-- Index for action tracking and response time calculations
-- Used by: Admin stats API for response time calculations
CREATE INDEX IF NOT EXISTS idx_no_dues_status_dept_action 
ON no_dues_status(department_name, status, action_at DESC) 
WHERE action_at IS NOT NULL;

-- Index for finding pending items older than X days (alerts)
-- Used by: Admin dashboard alerts for stuck requests
CREATE INDEX IF NOT EXISTS idx_no_dues_status_pending_old 
ON no_dues_status(status, created_at) 
WHERE status = 'pending';

-- Index for user action history
-- Used by: Staff stats to show personal approval/rejection counts
CREATE INDEX IF NOT EXISTS idx_no_dues_status_user_actions 
ON no_dues_status(action_by_user_id, department_name, status, action_at DESC) 
WHERE action_by_user_id IS NOT NULL;

-- Composite index for form lookups with status
-- Used by: Dashboard queries joining forms with their statuses
CREATE INDEX IF NOT EXISTS idx_no_dues_status_form_dept_status 
ON no_dues_status(form_id, department_name, status);

-- ========================================
-- NO_DUES_FORMS TABLE INDEXES
-- ========================================

-- Index for excluding manual entries (most critical filter)
-- Used by: All dashboard queries to separate manual from online submissions
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_manual_entry 
ON no_dues_forms(is_manual_entry, created_at DESC);

-- Index for form status and date sorting
-- Used by: Admin dashboard for filtering by overall status
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_status_created 
ON no_dues_forms(status, created_at DESC) 
WHERE is_manual_entry = false;

-- Index for registration number searches (exact and partial)
-- Used by: Search functionality in dashboards
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_registration_no 
ON no_dues_forms(registration_no) 
WHERE is_manual_entry = false;

-- Index for student name searches (case-insensitive)
-- Used by: Search functionality in dashboards
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_student_name_lower 
ON no_dues_forms(LOWER(student_name)) 
WHERE is_manual_entry = false;

-- Index for school/course/branch filtering (HOD department)
-- Used by: HOD department to filter by their assigned schools/courses
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_school_course_branch 
ON no_dues_forms(school_id, course_id, branch_id) 
WHERE is_manual_entry = false;

-- ========================================
-- PROFILES TABLE INDEXES
-- ========================================

-- ⚡ CRITICAL: Primary index for fast user profile lookups during login
-- Used by: AuthContext.loadProfile() and middleware auth checks
CREATE INDEX IF NOT EXISTS idx_profiles_id_fast_lookup
ON profiles(id);

-- ⚡ CRITICAL: Index for role validation (most frequent auth query)
-- Used by: Middleware role checks on every protected route
CREATE INDEX IF NOT EXISTS idx_profiles_id_role_fast
ON profiles(id, role);

-- Index for role-based access control
-- Used by: Authentication and authorization checks
CREATE INDEX IF NOT EXISTS idx_profiles_role
ON profiles(role);

-- Index for department staff lookups
-- Used by: Finding all staff members for a department
CREATE INDEX IF NOT EXISTS idx_profiles_dept_role
ON profiles(department_name, role)
WHERE role IN ('department', 'admin');

-- Index for HOD scope filtering (school/course/branch arrays)
-- Used by: HOD staff filtering their assigned scope
CREATE INDEX IF NOT EXISTS idx_profiles_hod_scope
ON profiles(department_name)
WHERE department_name = 'school_hod'
AND (school_ids IS NOT NULL OR course_ids IS NOT NULL OR branch_ids IS NOT NULL);

-- ⚡ PERFORMANCE: Covering index for complete profile data in single lookup
-- Used by: Login flow to get all profile data without table access
CREATE INDEX IF NOT EXISTS idx_profiles_login_covering
ON profiles(id)
INCLUDE (role, full_name, department_name, school_ids, course_ids, branch_ids);

-- ========================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ========================================

-- Covering index for dashboard list queries (reduces table lookups)
-- Used by: Main dashboard data fetch with all needed columns
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_dashboard_covering 
ON no_dues_forms(is_manual_entry, status, created_at DESC) 
INCLUDE (id, student_name, registration_no, course, branch, school, contact_no, updated_at, reapplication_count);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Run these queries to verify indexes are being used:

-- 1. Check index usage for staff dashboard query
EXPLAIN ANALYZE
SELECT * FROM no_dues_status 
WHERE department_name = 'library' 
AND status = 'pending' 
AND form_id IN (SELECT id FROM no_dues_forms WHERE is_manual_entry = false)
ORDER BY created_at DESC 
LIMIT 50;

-- 2. Check index usage for admin stats query
EXPLAIN ANALYZE
SELECT department_name, status, created_at, action_at 
FROM no_dues_status 
WHERE action_at IS NOT NULL;

-- 3. Check index usage for search query
EXPLAIN ANALYZE
SELECT * FROM no_dues_forms 
WHERE is_manual_entry = false 
AND (LOWER(student_name) LIKE LOWER('%test%') OR registration_no ILIKE '%test%')
ORDER BY created_at DESC;

-- ========================================
-- INDEX MAINTENANCE
-- ========================================

-- Run these periodically to maintain index health:

-- Reindex all tables (run during low traffic periods)
REINDEX TABLE no_dues_status;
REINDEX TABLE no_dues_forms;
REINDEX TABLE profiles;

-- Analyze tables to update query planner statistics
ANALYZE no_dues_status;
ANALYZE no_dues_forms;
ANALYZE profiles;

-- ========================================
-- PERFORMANCE MONITORING
-- ========================================

-- Monitor slow queries (requires pg_stat_statements extension)
-- SELECT * FROM pg_stat_statements 
-- WHERE query LIKE '%no_dues%' 
-- ORDER BY mean_exec_time DESC 
-- LIMIT 10;

-- Check index bloat
-- SELECT 
--   schemaname, tablename, 
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
--   pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
-- FROM pg_tables 
-- WHERE tablename IN ('no_dues_status', 'no_dues_forms', 'profiles')
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;