'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import GlassCard from '@/components/ui/GlassCard';
import StatsGrid from '@/components/dashboard/StatsGrid';
import ApplicationsTable from '@/components/admin/ApplicationsTable';
import { RefreshCcw, TrendingUp, Settings, GraduationCap, FileText, ChevronRight, Clock, Search, Download, MessageSquare, AlertCircle } from 'lucide-react';
import { exportApplicationsToCSV, exportStatsToCSV } from '@/lib/csvExport';
import toast from 'react-hot-toast';

// Performance Chart Component
const PerformanceBar = ({ label, pending, approved, timeTaken }) => (
  <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-jecrc-red/30 transition-all">
    <div className="flex justify-between items-center mb-2">
      <h4 className="font-semibold text-gray-900 dark:text-white capitalize">{label.replace(/_/g, ' ')}</h4>
      <div className="flex items-center gap-1 text-xs font-mono text-gray-500 dark:text-gray-400">
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

  // Support Tickets
  const [supportStats, setSupportStats] = useState({ total: 0, unread: 0, open: 0 });
  const [recentTickets, setRecentTickets] = useState([]);

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

  // Initial Load
  useEffect(() => {
    fetchStats();
    fetchApplications();
    fetchSupportStats();
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchApplications();
  }, [currentPage, statusFilter, searchTerm]);

  // ⚡⚡ FIXED REALTIME - Separate from filters (never recreates) ⚡⚡
  useEffect(() => {
    console.log("🔌 Admin Realtime: Connecting...");
    
    const channel = supabase.channel('admin_realtime_v3_fixed')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'no_dues_forms'
      }, (payload) => {
        console.log('📋 Admin: Form event detected:', payload.eventType);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          console.log("⚡ Refreshing Admin Dashboard (Form)...");
          fetchStats();
          fetchApplications();
          toast.success("New form detected!");
        }, 800);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'no_dues_status'
      }, (payload) => {
        console.log('📊 Admin: Status event detected:', payload.eventType);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          console.log("⚡ Refreshing Admin Dashboard (Status)...");
          fetchStats();
          fetchApplications();
          toast.success("Status updated!");
        }, 800);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_tickets'
      }, (payload) => {
        console.log('💬 Admin: Support ticket event detected:', payload.eventType);
        fetchSupportStats(); // Refresh support stats
        
        // Add toast notifications based on event type
        if (payload.eventType === 'INSERT') {
          const ticket = payload.new;
          toast.success(
            `🔔 New ${ticket.requester_type} support ticket #${ticket.ticket_number}`,
            { duration: 5000, icon: '📩' }
          );
        } else if (payload.eventType === 'UPDATE') {
          const ticket = payload.new;
          const oldTicket = payload.old;
          
          // Only show notification if status changed
          if (oldTicket.status !== ticket.status) {
            toast.info(
              `📝 Ticket #${ticket.ticket_number} status: ${oldTicket.status} → ${ticket.status}`,
              { duration: 4000 }
            );
          }
        } else if (payload.eventType === 'DELETE') {
          toast.error('🗑️ Support ticket deleted', { duration: 3000 });
        }
      })
      .subscribe((status) => {
        console.log('📡 Admin Realtime status:', status);
      });

    return () => {
      console.log("🔌 Admin Realtime: Disconnecting...");
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase.removeChannel(channel);
    };
  }, []); // ✅ FIXED: Empty dependencies - channel never recreates

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Command Center</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-2 px-2.5 py-1 bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Live</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Realtime Updates Active</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/admin/settings')} className="p-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-white group">
              <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            </button>
            <button
              onClick={() => {
                setLoading(true);
                fetchStats();
                fetchApplications();
              }}
              className="p-2.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl transition-all shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 1. KEY METRICS */}
        <StatsGrid stats={data.overallStats} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 2. DEPARTMENT PERFORMANCE */}
          <GlassCard className="lg:col-span-2 p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
              <TrendingUp className="w-5 h-5 text-jecrc-red dark:text-jecrc-red-bright" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Department Efficiency</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="space-y-4">
            {/* Support Tickets Widget */}
            <GlassCard className="p-6 cursor-pointer group hover:border-blue-500/50 transition-all" onClick={() => router.push('/admin/support')}>
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Support Tickets</h3>
              <div className="flex items-center gap-4 mt-2 text-sm">
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

            <GlassCard className="p-6 cursor-pointer group hover:border-jecrc-red/50 transition-all" onClick={() => router.push('/admin/convocation')}>
              <div className="flex justify-between items-start">
                <div className="p-3 bg-jecrc-rose dark:bg-jecrc-red/20 rounded-xl text-jecrc-red dark:text-jecrc-red-bright">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-jecrc-red transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-4">Convocation 2024</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage 9th Convocation List</p>
            </GlassCard>

            <GlassCard className="p-6 cursor-pointer group hover:border-emerald-500/50 transition-all" onClick={() => router.push('/admin/manual-entry')}>
              <div className="flex justify-between items-start">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <FileText className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-4">Manual Entries</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Offline Records Database</p>
            </GlassCard>
          </div>
        </div>

        {/* 4. SEARCH & FILTER */}
        <GlassCard className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or registration number..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red/40 focus:border-jecrc-red transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red/40 focus:border-jecrc-red transition-all"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Export Buttons */}
            <button
              onClick={() => {
                exportStatsToCSV(data);
                toast.success("Stats exported!");
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl transition-all font-medium shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red"
            >
              <Download className="w-4 h-4" />
              Export Stats
            </button>
            
            <button
              onClick={() => {
                exportApplicationsToCSV(applications);
                toast.success("Data exported!");
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-green-600/20"
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
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