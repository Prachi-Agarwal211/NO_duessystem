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

// Performance Chart Component
const PerformanceBar = ({ label, pending, approved, timeTaken }) => (
  <div className="p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-jecrc-red/30 transition-all">
    <div className="flex justify-between items-center mb-2 gap-2">
      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white capitalize truncate">{label.replace(/_/g, ' ')}</h4>
      <div className="flex items-center gap-1 text-xs font-mono text-gray-500 dark:text-gray-400 flex-shrink-0">
        <Clock className="w-3 h-3" /> {timeTaken || '~24'}h avg
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-yellow-600 dark:text-yellow-400">Pending: {pending}</span>
        <span className="text-green-600 dark:text-green-400">Cleared: {approved}</span>
      </div>
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-white/10">
        <div className="bg-yellow-400 transition-all duration-500" style={{ width: `${(pending / (pending + approved || 1)) * 100}%` }} />
        <div className="bg-green-500 transition-all duration-500" style={{ width: `${(approved / (pending + approved || 1)) * 100}%` }} />
      </div>
    </div>
  </div>
);

export default function EnhancedAdminDashboard() {
  const router = useRouter();
  const debounceTimer = useRef(null);

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

  // Department Reminders
  const [sendingReminder, setSendingReminder] = useState(false);
  const [delayedApplications, setDelayedApplications] = useState([]);

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

      // Fetch schools
      const schoolsRes = await fetch('/api/admin/config/schools', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const schoolsData = await schoolsRes.json();

      // Fetch courses
      const coursesRes = await fetch('/api/admin/config/courses', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const coursesData = await coursesRes.json();

      // Fetch branches
      const branchesRes = await fetch('/api/admin/config/branches', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const branchesData = await branchesRes.json();

      // Fetch departments
      const departmentsRes = await fetch('/api/admin/config/departments', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const departmentsData = await departmentsRes.json();

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

  // Fetch Applications with Filters
  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

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

  // Fetch Support Tickets Stats
  const fetchSupportStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch unread count
      const unreadRes = await fetch('/api/support/unread-count', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const unreadJson = await unreadRes.json();

      // Fetch recent tickets
      const ticketsRes = await fetch('/api/support?requester_type=student&limit=3', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const ticketsJson = await ticketsRes.json();

      if (unreadJson.success) {
        setSupportStats({
          total: ticketsJson.stats?.student_total + ticketsJson.stats?.department_total || 0,
          unread: unreadJson.unreadCount || 0,
          open: ticketsJson.stats?.student_open + ticketsJson.stats?.department_open || 0
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

  // Send Department Reminder
  const sendDepartmentReminder = async (departmentName) => {
    setSendingReminder(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // TODO: Implement API endpoint for sending reminders
      toast.loading('Sending reminder...', { id: 'reminder' });

      // Simulate API call (replace with actual endpoint)
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success(`Reminder sent to ${departmentName}!`, { id: 'reminder' });
    } catch (e) {
      console.error("Reminder error:", e);
      toast.error('Failed to send reminder', { id: 'reminder' });
    } finally {
      setSendingReminder(false);
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
    if (Object.keys(amazonFilters).length > 0) {
      fetchApplicationsWithFilters();
    } else {
      fetchApplications();
    }
  }, [currentPage, amazonFilters, statusFilter, searchTerm]);

  // Optimized Real-time Updates
  useEffect(() => {
    console.log('🔌 Setting up optimized admin real-time connection');
    
    const unsubscribe = optimizedRealtime.subscribe('admin', {
      onNewForm: (payload) => {
        console.log('🆕 Admin: New form submission detected');
        toast.success(`New application from ${payload.new?.student_name || 'Student'}`);
        fetchStats();
        fetchApplications();
      },
      onStatusUpdate: (payload) => {
        console.log('📊 Admin: Department status update detected');
        fetchStats();
        fetchApplications();
      },
      onSupportTicket: (payload) => {
        console.log('💬 Admin: Support ticket update detected');
        fetchSupportStats();
        
        // Show notification for new tickets
        if (payload.eventType === 'INSERT') {
          toast.success(`🔔 New ${payload.new.requester_type} support ticket`);
        }
      },
      onEmailLog: (payload) => {
        console.log('📧 Admin: Email log update detected');
        fetchEmailStats();
      },
      onConnectionChange: (status) => {
        console.log('📡 Admin connection status:', status);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []); // Empty dependency array - connection never recreates

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen space-y-6 sm:space-y-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Admin Command Center</h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Live</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Realtime Updates Active</span>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <AdminNotificationBell departmentStats={data.departmentStats} />
          <button onClick={() => router.push('/admin/settings')} className="p-3 min-h-[44px] min-w-[44px] bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-white group active:scale-95">
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          </button>
          <button
            onClick={() => {
              setLoading(true);
              fetchStats();
              fetchApplications();
            }}
            className="p-3 min-h-[44px] min-w-[44px] bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl transition-all shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red active:scale-95"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1. KEY METRICS */}
      <StatsGrid stats={data.overallStats} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

        {/* 2. DEPARTMENT PERFORMANCE */}
        <GlassCard className="lg:col-span-2 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 border-b border-gray-100 dark:border-white/5 pb-3 sm:pb-4">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-jecrc-red dark:text-jecrc-red-bright" />
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Department Efficiency</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {data.departmentStats.length === 0 ? (
              <div className="col-span-2 text-center py-10 text-gray-400">No active data</div>
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

        {/* 3. QUICK ACTIONS */}
        <div className="space-y-3 sm:space-y-4">
          {/* Support Tickets Widget */}
          <GlassCard className="p-4 sm:p-6 cursor-pointer group hover:border-blue-500/50 transition-all active:scale-[0.98]" onClick={() => router.push('/admin/support')}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end gap-1">
                {supportStats.unread > 0 && (
                  <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    {supportStats.unread} New
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Support Tickets</h3>
            <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm">
              <span className="text-yellow-600 dark:text-yellow-400">{supportStats.open} Open</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 dark:text-gray-400">{supportStats.total} Total</span>
            </div>

            {/* Recent Tickets Preview */}
            {recentTickets.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-gray-100 dark:border-white/5 pt-4">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center gap-2 text-xs">
                    {!ticket.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                    <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                      {ticket.message?.substring(0, 40)}...
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Email Monitoring Widget */}
          <GlassCard className="p-4 sm:p-6 cursor-pointer group hover:border-purple-500/50 transition-all active:scale-[0.98]" onClick={() => router.push('/admin/emails')}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400">
                <Mail className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end gap-1">
                {emailStats.failedCount > 0 && (
                  <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    {emailStats.failedCount} Failed
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Email Monitoring</h3>
            <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm">
              <span className="text-green-600 dark:text-green-400">{emailStats.successRate}% Success</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 dark:text-gray-400">{emailStats.totalEmails} Total</span>
            </div>
          </GlassCard>

          {/* Certificate Verification Widget */}
          <GlassCard className="p-4 sm:p-6 cursor-pointer group hover:border-indigo-500/50 transition-all active:scale-[0.98]" onClick={() => router.push('/admin/verify')}>
            <div className="flex justify-between items-start">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Shield className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-3 sm:mt-4">Certificate Verification</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">QR Scanner & Manual Verify</p>
          </GlassCard>

        </div>
      </div>

      {/* 4. AMAZON-STYLE FILTERS */}
      <GlassCard className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Amazon Filters */}
          <AmazonStyleFilters
            onFiltersChange={handleAmazonFiltersChange}
            availableFilters={availableFilters}
            loading={loading}
          />

          {/* Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={() => {
                exportStatsToCSV(data);
                toast.success("Stats exported!");
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl transition-all font-medium shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red active:scale-95 text-sm sm:text-base whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Stats</span>
              <span className="sm:hidden">Stats</span>
            </button>

            <button
              onClick={() => {
                exportApplicationsToCSV(applications);
                toast.success("Data exported!");
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-green-600/20 active:scale-95 text-sm sm:text-base whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Data</span>
              <span className="sm:hidden">Data</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* 5. APPLICATIONS TABLE WITH PAGINATION */}
      <ApplicationsTable
        key={`apps-${applications.length}-${currentPage}-${Date.now()}`}
        applications={applications}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
