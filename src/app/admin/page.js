'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import GlassCard from '@/components/ui/GlassCard';
import StatsGrid from '@/components/dashboard/StatsGrid';
import ApplicationsTable from '@/components/admin/ApplicationsTable';
import { RefreshCcw, TrendingUp, Settings, GraduationCap, FileText, ChevronRight, Clock, Search, Download, MessageSquare, AlertCircle, Mail, Bell, Shield } from 'lucide-react';
import { exportApplicationsToCSV, exportStatsToCSV } from '@/lib/csvExport';
import AmazonStyleFilters from '@/components/admin/AmazonStyleFilters';
import AdminNotificationBell from '@/components/admin/AdminNotificationBell';
import optimizedRealtime from '@/lib/optimizedRealtime';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';

// Performance Chart Component - Modernized with GlassCard
const PerformanceBar = ({ label, pending, approved, timeTaken }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`
      p-3 sm:p-4 rounded-xl border transition-all duration-300
      ${isDark
        ? 'bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
        : 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-white'
      }
    `}>
      <div className="flex justify-between items-center mb-2 gap-2">
        <h4 className="font-semibold text-sm sm:text-base capitalize truncate transition-colors">
          {label.replace(/_/g, ' ')}
        </h4>
        <div className="flex items-center gap-1 text-xs font-mono opacity-60 flex-shrink-0">
          <Clock className="w-3 h-3" /> {timeTaken || '~24'}h avg
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-yellow-600 dark:text-yellow-400">Pending: {pending}</span>
          <span className="text-green-600 dark:text-green-400">Cleared: {approved}</span>
        </div>
        <div className="flex h-2 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-white/10">
          <div className="bg-yellow-400 transition-all duration-1000 ease-out" style={{ width: `${(pending / (pending + approved || 1)) * 100}%` }} />
          <div className="bg-green-500 transition-all duration-1000 ease-out" style={{ width: `${(approved / (pending + approved || 1)) * 100}%` }} />
        </div>
      </div>
    </div>
  );
};

export default function EnhancedAdminDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Stats & Department Performance
  const [data, setData] = useState({ overallStats: {}, departmentStats: [] });
  const [loading, setLoading] = useState(true);

  // Applications Table
  const [applications, setApplications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [amazonFilters, setAmazonFilters] = useState({});
  const [availableFilters, setAvailableFilters] = useState({
    schools: [],
    courses: [],
    branches: [],
    departments: []
  });

  // Support Tickets
  const [supportStats, setSupportStats] = useState({ total: 0, unread: 0, open: 0 });
  const [recentTickets, setRecentTickets] = useState([]);

  // Email Stats
  const [emailStats, setEmailStats] = useState({ totalEmails: 0, sentCount: 0, failedCount: 0, successRate: 0 });

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/staff/login'); return; }

      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.overallStats) setData(json);
    } catch (e) {
      console.error("Stats Error:", e);
    }
  };

  // Fetch Available Filters
  const fetchAvailableFilters = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch all filter data in parallel
      const [schoolsRes, coursesRes, branchesRes, departmentsRes] = await Promise.all([
        fetch('/api/admin/config/schools', { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch('/api/admin/config/courses', { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch('/api/admin/config/branches', { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch('/api/admin/config/departments', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      ]);

      const [schoolsData, coursesData, branchesData, departmentsData] = await Promise.all([
        schoolsRes.json(), coursesRes.json(), branchesRes.json(), departmentsRes.json()
      ]);

      setAvailableFilters({
        schools: schoolsData.success ? schoolsData.schools || [] : [],
        courses: coursesData.success ? coursesData.courses || [] : [],
        branches: branchesData.success ? branchesData.branches || [] : [],
        departments: departmentsData.success ? departmentsData.departments || [] : []
      });
    } catch (e) {
      console.error("Available filters error:", e);
    }
  };

  // Handle Amazon Filters Change
  const handleAmazonFiltersChange = (filters) => {
    setAmazonFilters(filters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Fetch Applications with Amazon Filters
  const fetchApplicationsWithFilters = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      // Apply Amazon filters
      Object.entries(amazonFilters).forEach(([key, value]) => {
        if (value && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value);
          }
        }
      });

      // Apply legacy filters for compatibility
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/admin/dashboard?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });

      const json = await res.json();
      if (json.applications) {
        setApplications(json.applications);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalItems(json.pagination?.total || 0);
      }
    } catch (e) {
      console.error("Applications Error:", e);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  // Combined fetch function logic (for simplicity, we use the detailed one above mostly)
  const fetchApplications = fetchApplicationsWithFilters; // Use the comprehensive one

  // Fetch Support Tickets Stats
  const fetchSupportStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [unreadRes, ticketsRes] = await Promise.all([
        fetch('/api/support/unread-count', { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch('/api/support?requester_type=student&limit=3', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      ]);

      const unreadJson = await unreadRes.json();
      const ticketsJson = await ticketsRes.json();

      if (unreadJson.success) {
        setSupportStats({
          total: (ticketsJson.stats?.student_total || 0) + (ticketsJson.stats?.department_total || 0),
          unread: unreadJson.unreadCount || 0,
          open: (ticketsJson.stats?.student_open || 0) + (ticketsJson.stats?.department_open || 0)
        });
      }

      if (ticketsJson.success && ticketsJson.tickets) {
        setRecentTickets(ticketsJson.tickets.slice(0, 3));
      }
    } catch (e) {
      console.error("Support stats error:", e);
    }
  };

  // Fetch Email Stats
  const fetchEmailStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/email-logs?limit=100', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();

      if (json.success && json.stats) {
        setEmailStats(json.stats);
      }
    } catch (e) {
      console.error("Email stats error:", e);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchStats();
    fetchAvailableFilters();
    fetchApplications();
    fetchSupportStats();
    fetchEmailStats();
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchApplications();
  }, [currentPage, amazonFilters, statusFilter, searchTerm]);

  // Optimized Real-time Updates
  useEffect(() => {
    console.log('🔌 Setting up optimized admin real-time connection');

    const unsubscribe = optimizedRealtime.subscribe('admin', {
      onNewForm: (payload) => {
        toast.success(`New application from ${payload.new?.student_name || 'Student'}`);
        fetchStats();
        fetchApplications();
      },
      onStatusUpdate: () => {
        fetchStats();
        fetchApplications();
      },
      onSupportTicket: (payload) => {
        fetchSupportStats();
        if (payload.eventType === 'INSERT') {
          toast.success(`🔔 New ${payload.new.requester_type} support ticket`);
        }
      },
      onEmailLog: () => fetchEmailStats(),
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto min-h-screen space-y-6 sm:space-y-8 pb-20">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`
            text-2xl sm:text-3xl font-bold font-serif
            bg-gradient-to-r from-jecrc-red via-jecrc-red-dark to-transparent dark:from-jecrc-red-bright dark:via-jecrc-red dark:to-white
            bg-clip-text text-transparent
          `}>
            Admin Command Center
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Live System</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Updates detailed every 30s</span>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <AdminNotificationBell departmentStats={data.departmentStats} />
          <button onClick={() => router.push('/admin/settings')} className="p-3 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-white group active:scale-95 shadow-sm">
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          </button>
          <button
            onClick={() => {
              setLoading(true);
              fetchStats();
              fetchApplications();
            }}
            className="p-3 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl transition-all shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1. KEY METRICS */}
      <StatsGrid stats={data.overallStats} loading={loading} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* 2. DEPARTMENT PERFORMANCE */}
        <GlassCard className="xl:col-span-2 p-5 sm:p-6 h-full">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
            <TrendingUp className="w-5 h-5 text-jecrc-red dark:text-jecrc-red-bright" />
            <h3 className="text-lg font-bold">Department Efficiency</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.departmentStats.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-gray-400">No active data available</div>
            ) : (
              data.departmentStats.map((dept) => (
                <PerformanceBar
                  key={dept.department_name}
                  label={dept.department_name}
                  pending={dept.pending_count}
                  approved={dept.approved_count}
                  timeTaken={dept.avg_hours || 12}
                />
              ))
            )}
          </div>
        </GlassCard>

        {/* 3. QUICK ACTIONS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 h-full content-start">

          {/* Support Tickets Widget */}
          <GlassCard className="p-5 cursor-pointer group hover:border-blue-500/30 transition-all active:scale-[0.99] flex flex-col justify-between" onClick={() => router.push('/admin/support')}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  {supportStats.unread > 0 && (
                    <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-bounce">
                      {supportStats.unread} New
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:text-blue-500 transition-all" />
                </div>
              </div>
              <h3 className="text-lg font-bold">Support Center</h3>
              <div className="flex items-center gap-3 mt-1 text-sm font-medium">
                <span className="text-yellow-600 dark:text-yellow-400">{supportStats.open} Open</span>
                <span className="opacity-30">•</span>
                <span className="opacity-60">{supportStats.total} Total</span>
              </div>
            </div>
          </GlassCard>

          {/* Email Monitoring Widget */}
          <GlassCard className="p-5 cursor-pointer group hover:border-purple-500/30 transition-all active:scale-[0.99] flex flex-col justify-between" onClick={() => router.push('/admin/emails')}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400">
                  <Mail className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:text-purple-500 transition-all" />
              </div>
              <h3 className="text-lg font-bold">Email System</h3>
              <div className="flex items-center gap-3 mt-1 text-sm font-medium">
                <span className="text-green-600 dark:text-green-400">{emailStats.successRate}% Success</span>
                <span className="opacity-30">•</span>
                <span className="opacity-60">{emailStats.totalEmails} Sent</span>
              </div>
            </div>
          </GlassCard>

          {/* Certificate Verification Widget */}
          <GlassCard className="p-5 cursor-pointer group hover:border-indigo-500/30 transition-all active:scale-[0.99] flex flex-col justify-between" onClick={() => router.push('/admin/verify')}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Shield className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:text-indigo-500 transition-all" />
              </div>
              <h3 className="text-lg font-bold">Verification</h3>
              <p className="text-sm opacity-60 mt-1">Manual & QR Verify</p>
            </div>
          </GlassCard>

        </div>
      </div>

      {/* 4. AMAZON-STYLE FILTERS & CONTROLS */}
      <GlassCard className="p-5">
        <div className="flex flex-col gap-5">
          <AmazonStyleFilters
            onFiltersChange={handleAmazonFiltersChange}
            availableFilters={availableFilters}
            loading={loading}
          />

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
            <button
              onClick={() => {
                exportStatsToCSV(data);
                toast.success("Stats exported!");
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-lg transition-all font-bold shadow-lg shadow-jecrc-red/20 active:scale-95 text-sm"
            >
              <Download className="w-4 h-4" />
              Export Stats
            </button>

            <button
              onClick={() => {
                exportApplicationsToCSV(applications);
                toast.success("Data exported!");
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all font-bold shadow-lg shadow-green-600/20 active:scale-95 text-sm"
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>
      </GlassCard>

      {/* 5. APPLICATIONS TABLE */}
      <ApplicationsTable
        key={`apps-${applications.length}-${currentPage}`}
        applications={applications}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
