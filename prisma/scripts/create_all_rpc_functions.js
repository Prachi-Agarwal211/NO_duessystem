const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^"|"$/g, '');
    }
  });
  console.log('✅ Loaded .env.local file manually');
} else {
  console.error('❌ .env.local file not found at:', envPath);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Creating ALL RPC Database Functions...\n');

  // ============================================================================
  // 1. STUDENT LOOKUP FUNCTIONS
  // ============================================================================

  // Drop existing
  await executeSQL('DROP FUNCTION IF EXISTS search_student_data(TEXT)');
  await executeSQL('DROP FUNCTION IF EXISTS get_student_by_regno(TEXT)');

  // search_student_data - Used by GET /api/student/lookup
  await executeSQL(`
    CREATE OR REPLACE FUNCTION search_student_data(p_search_term TEXT)
    RETURNS TABLE (
      registration_no TEXT,
      student_name TEXT,
      parent_name TEXT,
      admission_year TEXT,
      passing_year TEXT,
      school_id TEXT,
      course_id TEXT,
      branch_id TEXT,
      school TEXT,
      course TEXT,
      branch TEXT,
      country_code TEXT,
      contact_no TEXT,
      personal_email TEXT,
      college_email TEXT,
      no_dues_status TEXT,
      certificate_url TEXT,
      "alumniProfileLink" TEXT
    ) 
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        s.registration_no,
        s.student_name,
        s.parent_name,
        s.admission_year,
        s.passing_year,
        f.school_id,
        f.course_id,
        f.branch_id,
        s.school,
        s.course,
        s.branch,
        f.country_code,
        s.contact_no,
        s.personal_email,
        s.college_email,
        f.status,
        f.certificate_url,
        f.alumni_profile_link
      FROM student_data s
      LEFT JOIN no_dues_forms f ON s.form_id = f.id
      WHERE s.registration_no ILIKE p_search_term || '%'
         OR s.student_name ILIKE '%' || p_search_term || '%'
      LIMIT 20;
    END;
    $$
  `);
  console.log('✅ Created: search_student_data(p_search_term)');

  // get_student_by_regno - Used by POST /api/student/lookup
  await executeSQL(`
    CREATE OR REPLACE FUNCTION get_student_by_regno(p_registration_no TEXT)
    RETURNS TABLE (
      registration_no TEXT,
      student_name TEXT,
      parent_name TEXT,
      admission_year TEXT,
      passing_year TEXT,
      school_id TEXT,
      course_id TEXT,
      branch_id TEXT,
      school TEXT,
      course TEXT,
      branch TEXT,
      country_code TEXT,
      contact_no TEXT,
      personal_email TEXT,
      college_email TEXT,
      no_dues_status TEXT,
      certificate_url TEXT,
      "alumniProfileLink" TEXT
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        s.registration_no,
        s.student_name,
        s.parent_name,
        s.admission_year,
        s.passing_year,
        f.school_id,
        f.course_id,
        f.branch_id,
        s.school,
        s.course,
        s.branch,
        f.country_code,
        s.contact_no,
        s.personal_email,
        s.college_email,
        f.status,
        f.certificate_url,
        f.alumni_profile_link
      FROM student_data s
      LEFT JOIN no_dues_forms f ON s.form_id = f.id
      WHERE s.registration_no = p_registration_no;
    END;
    $$
  `);
  console.log('✅ Created: get_student_by_regno(p_registration_no)');

  // ============================================================================
  // 2. ADMIN DASHBOARD STATISTICS FUNCTIONS
  // ============================================================================

  // Drop existing
  await executeSQL('DROP FUNCTION IF EXISTS get_form_statistics()');
  await executeSQL('DROP FUNCTION IF EXISTS get_department_workload()');

  // get_form_statistics - Used by admin dashboard and stats APIs
  await executeSQL(`
    CREATE OR REPLACE FUNCTION get_form_statistics()
    RETURNS TABLE (
      total_applications BIGINT,
      pending_applications BIGINT,
      approved_applications BIGINT,
      rejected_applications BIGINT
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        COUNT(*)::BIGINT as total_applications,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_applications,
        COUNT(*) FILTER (WHERE status = 'approved' OR status = 'completed')::BIGINT as approved_applications,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_applications
      FROM no_dues_forms;
    END;
    $$
  `);
  console.log('✅ Created: get_form_statistics()');

  // get_department_workload - Used by admin dashboard and stats APIs
  await executeSQL(`
    CREATE OR REPLACE FUNCTION get_department_workload()
    RETURNS TABLE (
      department_name TEXT,
      pending_count BIGINT,
      approved_count BIGINT,
      rejected_count BIGINT
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        nds.department_name,
        COUNT(*) FILTER (WHERE nds.status = 'pending')::BIGINT as pending_count,
        COUNT(*) FILTER (WHERE nds.status = 'approved')::BIGINT as approved_count,
        COUNT(*) FILTER (WHERE nds.status = 'rejected')::BIGINT as rejected_count
      FROM no_dues_status nds
      GROUP BY nds.department_name
      ORDER BY nds.department_name;
    END;
    $$
  `);
  console.log('✅ Created: get_department_workload()');

  // ============================================================================
  // 3. STAFF PERFORMANCE FUNCTIONS
  // ============================================================================

  // Drop existing
  await executeSQL('DROP FUNCTION IF EXISTS get_staff_performance(UUID)');
  await executeSQL('DROP FUNCTION IF EXISTS get_staff_leaderboard(TEXT, INTEGER)');

  // get_staff_performance - Used by admin/staff/[id] API
  await executeSQL(`
    CREATE OR REPLACE FUNCTION get_staff_performance(p_staff_id UUID)
    RETURNS TABLE (
      total_actions BIGINT,
      total_approved BIGINT,
      total_rejected BIGINT,
      today_actions BIGINT,
      week_actions BIGINT,
      month_actions BIGINT,
      approval_rate NUMERIC,
      avg_response_hours NUMERIC,
      sla_compliance_rate NUMERIC
    )
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_today TIMESTAMP := date_trunc('day', NOW());
      v_week_ago TIMESTAMP := NOW() - INTERVAL '7 days';
      v_month_ago TIMESTAMP := NOW() - INTERVAL '30 days';
    BEGIN
      RETURN QUERY
      WITH staff_actions AS (
        SELECT 
          status,
          action_at,
          created_at,
          EXTRACT(EPOCH FROM (action_at - created_at)) / 3600 as response_hours
        FROM no_dues_status
        WHERE action_by = p_staff_id::TEXT
          AND action_at IS NOT NULL
      )
      SELECT 
        COUNT(*)::BIGINT as total_actions,
        COUNT(*) FILTER (WHERE status = 'approved')::BIGINT as total_approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as total_rejected,
        COUNT(*) FILTER (WHERE action_at >= v_today)::BIGINT as today_actions,
        COUNT(*) FILTER (WHERE action_at >= v_week_ago)::BIGINT as week_actions,
        COUNT(*) FILTER (WHERE action_at >= v_month_ago)::BIGINT as month_actions,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(*) FILTER (WHERE status = 'approved')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
          ELSE 0 
        END as approval_rate,
        ROUND(AVG(response_hours)::NUMERIC, 2) as avg_response_hours,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(*) FILTER (WHERE response_hours < 48)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
          ELSE NULL 
        END as sla_compliance_rate
      FROM staff_actions;
    END;
    $$
  `);
  console.log('✅ Created: get_staff_performance(p_staff_id)');

  // get_staff_leaderboard - Used by admin/staff/leaderboard API
  await executeSQL(`
    CREATE OR REPLACE FUNCTION get_staff_leaderboard(p_sort_by TEXT, p_limit INTEGER)
    RETURNS TABLE (
      rank BIGINT,
      staff_id TEXT,
      full_name TEXT,
      department_name TEXT,
      total_actions BIGINT,
      approval_rate NUMERIC,
      avg_response_hours NUMERIC,
      sla_compliance_rate NUMERIC,
      active_days BIGINT
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      WITH staff_stats AS (
        SELECT 
          nds.action_by,
          COUNT(*)::BIGINT as total_actions,
          COUNT(*) FILTER (WHERE nds.status = 'approved')::BIGINT as approved_count,
          COUNT(*) FILTER (WHERE nds.status = 'rejected')::BIGINT as rejected_count,
          ROUND(AVG(EXTRACT(EPOCH FROM (nds.action_at - nds.created_at)) / 3600)::NUMERIC, 2) as avg_response_hours,
          COUNT(DISTINCT DATE(nds.action_at))::BIGINT as active_days,
          COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (nds.action_at - nds.created_at)) / 3600 < 48)::BIGINT as sla_compliant
        FROM no_dues_status nds
        WHERE nds.action_by IS NOT NULL
          AND nds.action_at IS NOT NULL
        GROUP BY nds.action_by
      ),
      ranked AS (
        SELECT 
          p.id as staff_id,
          p.full_name,
          p.department_name,
          COALESCE(ss.total_actions, 0) as total_actions,
          CASE 
            WHEN COALESCE(ss.total_actions, 0) > 0 
            THEN ROUND((ss.approved_count::NUMERIC / ss.total_actions::NUMERIC) * 100, 2)
            ELSE 0 
          END as approval_rate,
          ss.avg_response_hours,
          CASE 
            WHEN COALESCE(ss.total_actions, 0) > 0 
            THEN ROUND((ss.sla_compliant::NUMERIC / ss.total_actions::NUMERIC) * 100, 2)
            ELSE NULL 
          END as sla_compliance_rate,
          COALESCE(ss.active_days, 0) as active_days
        FROM profiles p
        LEFT JOIN staff_stats ss ON p.id::TEXT = ss.action_by
        WHERE p.role = 'department'
          AND p.is_active = true
          AND COALESCE(ss.total_actions, 0) > 0
      )
      SELECT 
        ROW_NUMBER() OVER (
          ORDER BY 
            CASE p_sort_by
              WHEN 'approval_rate' THEN ranked.approval_rate
              WHEN 'sla_compliance_rate' THEN ranked.sla_compliance_rate
              WHEN 'active_days' THEN ranked.active_days::NUMERIC
              ELSE ranked.total_actions::NUMERIC
            END DESC NULLS LAST,
            CASE p_sort_by
              WHEN 'avg_response_hours' THEN ranked.avg_response_hours
              ELSE NULL
            END ASC NULLS LAST
        ) as rank,
        ranked.staff_id,
        ranked.full_name,
        ranked.department_name,
        ranked.total_actions,
        ranked.approval_rate,
        ranked.avg_response_hours,
        ranked.sla_compliance_rate,
        ranked.active_days
      FROM ranked
      LIMIT p_limit;
    END;
    $$
  `);
  console.log('✅ Created: get_staff_leaderboard(p_sort_by, p_limit)');

  console.log('\n🎉 All RPC functions created successfully!');
  console.log('\n📋 Summary of created functions:');
  console.log('   - search_student_data(p_search_term TEXT)');
  console.log('   - get_student_by_regno(p_registration_no TEXT)');
  console.log('   - get_form_statistics()');
  console.log('   - get_department_workload()');
  console.log('   - get_staff_performance(p_staff_id UUID)');
  console.log('   - get_staff_leaderboard(p_sort_by TEXT, p_limit INTEGER)');
}

async function executeSQL(sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
    return true;
  } catch (e) {
    console.error('❌ SQL Error:', e.message);
    return false;
  }
}

main()
  .catch(e => console.error('Fatal error:', e))
  .finally(() => prisma.$disconnect());
