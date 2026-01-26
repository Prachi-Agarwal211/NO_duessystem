'use client';

import { useState, useEffect } from 'react';
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

// Performance Chart Component - Optimized for light/dark mode with better contrast
const PerformanceBar = ({ label, pending, approved, timeTaken }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`
      p-4 rounded-lg border transition-all duration-300
      ${isDark
        ? 'bg-gray-800/80 border-gray-700'
        : 'bg-gray-50 border-gray-200'
      }
    `}>
      <div className="flex justify-between items-center mb-3 gap-2">
        <h4 className={`font-semibold text-sm capitalize truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          {label.replace(/_/g, ' ')}
        </h4>
        <div className={`flex items-center gap-1.5 text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <Clock className="w-3 h-3" /> {timeTaken || '~24'}h
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>Pending: {pending}</span>
          <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>Cleared: {approved}</span>
        </div>
        <div className={`flex h-2.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div className="bg-amber-400 transition-all duration-1000 ease-out" style={{ width: `${(pending / (pending + approved || 1)) * 100}%` }} />
          <div className="bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${(approved / (pending + approved || 1)) * 100}%` }} />
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

  // Optimized Real-time Updates - Update data in-place without full refresh
  useEffect(() => {
    console.log('🔌 Setting up optimized admin real-time connection');

    const unsubscribe = optimizedRealtime.subscribe('admin', {
      onNewForm: (payload) => {
        if (payload.new) {
          // Fetch just this one new item and prepend to list
          fetch(`/api/admin/application?id=${payload.new.id}`)
            .then(res => res.json())
            .then(json => {
              if (json.success && json.data) {
                setApplications(prev => {
                  // Check if already exists to prevent duplicates
                  if (prev.some(app => app.id === json.data.id)) return prev;
                  return [json.data, ...prev];
                });
                setTotalItems(prev => prev + 1);

                // Update overall stats in-place (increment total)
                setData(prev => ({
                  ...prev,
                  overallStats: {
                    ...prev.overallStats,
                    total: (prev.overallStats.total || 0) + 1,
                    pending: (prev.overallStats.pending || 0) + 1
                  }
                }));

                toast.success(`📝 New application: ${json.data.student_name}`);
              }
            });
        }
      },
      onStatusUpdate: (payload) => {
        if (payload.new && payload.new.form_id) {
          const newStatus = payload.new.status;

          // Update the specific row in-place in applications list
          setApplications(prev => prev.map(app =>
            app.id === payload.new.form_id
              ? { ...app, overall_status: newStatus, status: newStatus }
              : app
          ));

          // Update department stats in-place based on status change
          setData(prev => {
            const deptStats = (prev.departmentStats || []).map(dept => {
              // Check if this department's status changed
              if (payload.new.department_name &&
                dept.department_name === payload.new.department_name) {
                return {
                  ...dept,
                  pending_count: newStatus === 'pending' ? dept.pending_count + 1 :
                    (dept.pending_count > 0 ? dept.pending_count - 1 : 0),
                  approved_count: newStatus === 'approved' ? dept.approved_count + 1 :
                    (newStatus === 'pending' ? dept.approved_count : dept.approved_count)
                };
              }
              return dept;
            });

            return {
              ...prev,
              departmentStats: deptStats,
              overallStats: {
                ...prev.overallStats,
                // Adjust overall counts based on status
                pending: newStatus === 'pending' ? (prev.overallStats.pending || 0) + 1 :
                  (prev.overallStats.pending > 0 ? prev.overallStats.pending - 1 : 0),
                approved: newStatus === 'approved' ? (prev.overallStats.approved || 0) + 1 :
                  (prev.overallStats.approved || 0)
              }
            };
          });
        }
      },
      onSupportTicket: (payload) => {
        // Update support stats in-place
        setSupportStats(prev => ({
          ...prev,
          total: prev.total + 1,
          open: payload.eventType === 'INSERT' ? prev.open + 1 : prev.open,
          unread: payload.eventType === 'INSERT' ? prev.unread + 1 : prev.unread
        }));

        if (payload.eventType === 'INSERT') {
          toast.success(`🔔 New ${payload.new?.requester_type || 'user'} support ticket`);
        }
      },
      onEmailLog: () => {
        // Increment email stats
        setEmailStats(prev => ({
          ...prev,
          totalEmails: prev.totalEmails + 1
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto min-h-screen space-y-6 sm:space-y-8 pb-20 bg-gray-50 dark:bg-gray-950">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`
            text-2xl sm:text-3xl font-bold font-serif
            ${isDark
              ? 'bg-gradient-to-r from-jecrc-red-bright via-jecrc-red to-white bg-clip-text text-transparent [text-shadow:0_0_30px_rgba(196,30,58,0.3)]'
              : 'bg-gradient-to-r from-jecrc-red-dark via-jecrc-red to-gray-800 bg-clip-text text-transparent'
            }
          `}>
            Admin Command Center
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-100'}`}>
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className={`text-xs font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Live System</span>
            </div>
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Updates detailed every 30s</span>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <AdminNotificationBell
            departmentStats={data.departmentStats}
            onRefresh={() => {
              fetchStats();
              fetchApplications();
            }}
          />
          <button onClick={() => router.push('/admin/settings')} className={`p-3 rounded-xl transition-all active:scale-95 shadow-sm border ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setLoading(true);
              fetchStats();
              fetchApplications();
            }}
            className={`p-3 rounded-xl transition-all shadow-lg active:scale-95 ${isDark ? 'bg-jecrc-red text-white hover:bg-jecrc-red-dark' : 'bg-jecrc-red text-white hover:bg-jecrc-red-dark'}`}
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1. KEY METRICS */}
      <StatsGrid stats={data.overallStats} loading={loading} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* 2. DEPARTMENT PERFORMANCE */}
        <GlassCard className="xl:col-span-2 p-5 sm:p-6 h-full">
          <div className={`flex items-center gap-2 mb-6 border-b pb-4 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
            <TrendingUp className={`w-5 h-5 ${isDark ? 'text-jecrc-red-bright' : 'text-jecrc-red'}`} />
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Department Efficiency</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.departmentStats.length === 0 ? (
              <div className={`col-span-2 text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No active data available</div>
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
                <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  {supportStats.unread > 0 && (
                    <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-bounce">
                      {supportStats.unread} New
                    </span>
                  )}
                  <ChevronRight className={`w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:text-blue-500 transition-all ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                </div>
              </div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Support Center</h3>
              <div className={`flex items-center gap-3 mt-1 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
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
                <div className={`p-3 rounded-xl ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                  <Mail className="w-6 h-6" />
                </div>
                <ChevronRight className={`w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:text-purple-500 transition-all ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Email System</h3>
              <div className={`flex items-center gap-3 mt-1 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
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
                <div className={`p-3 rounded-xl ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                  <Shield className="w-6 h-6" />
                </div>
                <ChevronRight className={`w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:text-indigo-500 transition-all ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Verification</h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manual & QR Verify</p>
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

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <button
              onClick={() => {
                exportStatsToCSV(data);
                toast.success("Stats exported!");
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl transition-all font-bold shadow-lg shadow-jecrc-red/20 active:scale-95 text-sm"
            >
              <Download className="w-4 h-4" />
              Export Detailed Stats
            </button>

            <button
              onClick={() => {
                exportApplicationsToCSV(applications);
                toast.success("Data exported!");
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-bold shadow-lg shadow-green-600/20 active:scale-95 text-sm"
            >
              <Download className="w-4 h-4" />
              Export Application Data
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
