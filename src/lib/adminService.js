import { supabase } from './supabaseClient';

// This is the server-side admin client for bypassing RLS
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Admin service functions for complex operations
export const adminService = {
  // Get all requests with filtering and pagination
  async getRequests(filterOptions = {}) {
    const { page = 1, limit = 20, status, department, search } = filterOptions;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status (
          id,
          department_name,
          status,
          action_at,
          created_at,
          rejection_reason
        ),
        profiles!no_dues_forms_user_id_fkey (
          email,
          registration_no
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(
        `student_name.ilike.%${search}%,registration_no.ilike.%${search}%,course.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return data;
  },

  // Get admin dashboard statistics
  async getDashboardStats() {
    const { data: { session } } = await supabase.auth.getSession();
    
    const [overallStats, departmentStats, recentActivity] = await Promise.all([
      supabaseAdmin
        .from('no_dues_forms')
        .select(`
          count(*) as total_requests,
          count(case when status = 'completed' then 1 end) as completed_requests,
          count(case when status = 'pending' then 1 end) as pending_requests,
          count(case when status = 'rejected' then 1 end) as rejected_requests,
          count(case when status = 'in_progress' then 1 end) as in_progress_requests
        `)
        .single(),
      
      supabaseAdmin
        .from('no_dues_status')
        .select(`
          department_name,
          count(*) as total_requests,
          count(case when status = 'approved' then 1 end) as approved_requests,
          count(case when status = 'rejected' then 1 end) as rejected_requests,
          avg(extract(epoch from (action_at - created_at))) as avg_response_time_seconds
        `)
        .not('action_at', 'is', null)
        .group('department_name'),
      
      supabaseAdmin
        .from('no_dues_status')
        .select(`
          id,
          action_at,
          department_name,
          status,
          no_dues_forms!inner (
            student_name,
            registration_no
          )
        `)
        .gte('action_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('action_at', { ascending: false })
        .limit(50)
    ]);

    return {
      overallStats: overallStats.data,
      departmentStats: departmentStats.data,
      recentActivity: recentActivity.data
    };
  },

  // Generate reports
  async generateReport(reportType, params = {}) {
    const { startDate, endDate, department } = params;
    
    let query = supabaseAdmin
      .from('no_dues_status')
      .select(`
        department_name,
        status,
        action_at,
        created_at,
        no_dues_forms (
          student_name,
          registration_no,
          created_at as form_created_at
        )
      `);

    if (startDate) {
      query = query.gte('action_at', startDate);
    }

    if (endDate) {
      query = query.lte('action_at', endDate);
    }

    if (department) {
      query = query.eq('department_name', department);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Process the data based on report type
    switch (reportType) {
      case 'department-performance':
        return this.processDepartmentPerformance(data);
      
      case 'time-analysis':
        return this.processTimeAnalysis(data);
      
      default:
        return data;
    }
  },

  // Process department performance data
  processDepartmentPerformance(statusData) {
    const performanceByDept = {};
    
    statusData.forEach(item => {
      const dept = item.department_name;
      
      if (!performanceByDept[dept]) {
        performanceByDept[dept] = {
          approved: 0,
          rejected: 0,
          pending: 0,
          total: 0,
          avgResponseTime: 0
        };
      }
      
      performanceByDept[dept][item.status]++;
      performanceByDept[dept].total++;
      
      if (item.action_at) {
        const responseTime = new Date(item.action_at) - new Date(item.created_at);
        performanceByDept[dept].avgResponseTime += responseTime;
      }
    });
    
    // Calculate averages
    Object.keys(performanceByDept).forEach(dept => {
      const deptData = performanceByDept[dept];
      if (deptData.approved + deptData.rejected > 0) {
        deptData.avgResponseTime = (deptData.avgResponseTime / (deptData.approved + deptData.rejected)) / (1000 * 60); // Convert to minutes
      }
    });
    
    return performanceByDept;
  },

  // Process time analysis data
  processTimeAnalysis(statusData) {
    const timeAnalysis = {
      responseTimeDistribution: {},
      statusChangeRates: {},
      avgResponseTime: 0,
      totalRequests: statusData.length
    };
    
    let totalTime = 0;
    let completedCount = 0;
    
    statusData.forEach(item => {
      if (item.action_at) {
        const responseTime = new Date(item.action_at) - new Date(item.created_at);
        totalTime += responseTime;
        completedCount++;
        
        // Group by response time ranges
        const hours = Math.floor(responseTime / (1000 * 60 * 60));
        const range = hours < 1 ? 'Under 1 hour' : 
                     hours < 24 ? '1-24 hours' : 
                     hours < 168 ? '1-7 days' : 
                     'Over 7 days';
        
        timeAnalysis.responseTimeDistribution[range] = (timeAnalysis.responseTimeDistribution[range] || 0) + 1;
      }
    });
    
    timeAnalysis.avgResponseTime = completedCount > 0 ? (totalTime / completedCount) / (1000 * 60) : 0; // Convert to minutes
    
    return timeAnalysis;
  },

  // Get request details by ID
  async getRequestById(requestId) {
    const { data, error } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status (
          id,
          department_name,
          status,
          action_at,
          action_by_user_id,
          rejection_reason,
          profiles (
            full_name
          )
        ),
        profiles!no_dues_forms_user_id_fkey (
          email
        )
      `)
      .eq('id', requestId)
      .single();

    if (error) throw error;

    // Calculate response times
    const requestWithMetrics = {
      ...data,
      no_dues_status: data.no_dues_status.map(status => ({
        ...status,
        response_time: this.calculateResponseTime(data.created_at, status.created_at, status.action_at)
      }))
    };

    return requestWithMetrics;
  },

  // Calculate response time
  calculateResponseTime(formCreated, statusCreated, actionAt) {
    if (!actionAt) return 'Pending';
    
    const created = new Date(statusCreated);
    const action = new Date(actionAt);
    const diff = action - created;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  },

  // Get departments list
  async getDepartments() {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('*')
      .order('display_order');

    if (error) throw error;
    return data;
  },

  // Get all users with roles
  async getAllUsers() {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Update user role
  async updateUserRole(userId, role) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select();

    if (error) throw error;
    return data;
  }
};