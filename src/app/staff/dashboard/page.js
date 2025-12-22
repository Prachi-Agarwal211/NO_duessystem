'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { RefreshCcw, Search, CheckCircle, XCircle, Clock, TrendingUp, Calendar, Download, FileCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pending');
  const [data, setData] = useState({ stats: {}, applications: [], departments: [] });
  const [rejectedForms, setRejectedForms] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debounceTimer = useRef(null);
  const [historyFetched, setHistoryFetched] = useState(false);
  const [rejectedFetched, setRejectedFetched] = useState(false);

  const fetchDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/staff/login'); return; }

      const res = await fetch(`/api/staff/dashboard?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error("Staff Dashboard Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRejectedForms = async () => {
    if (rejectedFetched) return;
    setRejectedLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/staff/history?status=rejected&limit=100&t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.success) {
        setRejectedForms(json.data.history || []);
        setRejectedFetched(true);
      }
    } catch (e) {
      console.error("Rejected Forms Error:", e);
    } finally {
      setRejectedLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (historyFetched) return;
    setHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/staff/history?limit=100&t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.success) {
        setHistoryData(json.data.history || []);
        setHistoryFetched(true);
      }
    } catch (e) {
      console.error("History Error:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    
    // Enhanced Realtime - Listens to BOTH tables
    const channel = supabase.channel('staff_dashboard_realtime_hybrid')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'no_dues_forms'
      }, (payload) => {
        console.log('📋 Form event detected:', payload.eventType);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          console.log("⚡ Refreshing Dashboard (New Form)...");
          fetchDashboard();
          // Invalidate cached tabs
          setHistoryFetched(false);
          setRejectedFetched(false);
          toast.success("New form detected!");
        }, 800);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'no_dues_status'
      }, (payload) => {
        console.log('📊 Status event detected:', payload.eventType);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          console.log("⚡ Refreshing Dashboard (Status Change)...");
          fetchDashboard();
          // Invalidate cached tabs
          setHistoryFetched(false);
          setRejectedFetched(false);
          toast.success("Status updated!");
        }, 800);
      })
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);
      });

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch data when switching tabs
  useEffect(() => {
    if (activeTab === 'rejected') fetchRejectedForms();
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const handleAction = async (e, formId, departmentName, action) => {
    e.stopPropagation();
    
    const prevData = { ...data };
    setData(prev => ({
        ...prev,
        stats: {
            ...prev.stats,
            pending: Math.max(0, prev.stats.pending - 1),
            approved: action === 'approve' ? prev.stats.approved + 1 : prev.stats.approved,
            rejected: action === 'reject' ? prev.stats.rejected + 1 : prev.stats.rejected,
            total: prev.stats.total + 1
        },
        applications: prev.applications.filter(app => app.no_dues_forms.id !== formId)
    }));
    toast.success('Processing...');

    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // ✅ FIX: Only send reason for rejections, not for approvals
        const requestBody = action === 'approve'
          ? { formId, departmentName, action }
          : { formId, departmentName, action, reason: "Quick Action" };
        
        const res = await fetch('/api/staff/action', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(requestBody)
        });
        if (!res.ok) throw new Error('Failed');
        toast.success(action === 'approve' ? 'Approved ✓' : 'Rejected');
        
        // Invalidate history cache
        setHistoryFetched(false);
        setRejectedFetched(false);
    } catch (err) {
        setData(prevData);
        toast.error("Action failed, rolling back.");
    }
  };

  const formatDate = (date) => {
      if (!date) return 'N/A';
      try { 
          return new Date(date).toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'short',
              year: 'numeric'
          }); 
      }
      catch (e) { return 'Invalid'; }
  };

  const filtered = data.applications.filter(app => 
    app.no_dues_forms.student_name.toLowerCase().includes(search.toLowerCase()) ||
    app.no_dues_forms.registration_no.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRejected = rejectedForms.filter(item =>
    item.no_dues_forms?.student_name.toLowerCase().includes(search.toLowerCase()) ||
    item.no_dues_forms?.registration_no.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = historyData.filter(item =>
    item.no_dues_forms?.student_name.toLowerCase().includes(search.toLowerCase()) ||
    item.no_dues_forms?.registration_no.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-4">
          <div>
             <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
               {data.departments?.[0]?.displayName || 'Department'} Dashboard
             </h1>
             <div className="flex items-center gap-2 mt-2">
               <div className="flex items-center gap-2 px-2.5 py-1 bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-full">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                 <span className="text-xs font-medium text-green-700 dark:text-green-400">Live</span>
               </div>
               <span className="text-xs text-gray-500 dark:text-gray-400">Realtime Updates Active</span>
             </div>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchDashboard();
              setHistoryFetched(false);
              setRejectedFetched(false);
            }}
            className="p-3 min-h-[44px] min-w-[44px] bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red transition-all active:scale-95"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats Cards - Clickable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => setActiveTab('pending')}
            className="text-left transform transition-all duration-300 hover:scale-[1.02] active:scale-95 min-h-[44px]"
          >
            <GlassCard className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Pending</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.stats?.pending || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Awaiting action</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </GlassCard>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className="text-left transform transition-all duration-300 hover:scale-[1.02] active:scale-95 min-h-[44px]"
          >
            <GlassCard className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">My Approved</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.stats?.approved || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">By you</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </GlassCard>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className="text-left transform transition-all duration-300 hover:scale-[1.02] active:scale-95 min-h-[44px]"
          >
            <GlassCard className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">My Rejected</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.stats?.rejected || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">By you</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-xl">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </GlassCard>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className="text-left transform transition-all duration-300 hover:scale-[1.02] active:scale-95 min-h-[44px]"
          >
            <GlassCard className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">My Total</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.stats?.total || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{data.stats?.approvalRate || 0}% approval</p>
                </div>
                <div className="p-3 bg-jecrc-red/10 dark:bg-jecrc-red/20 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-jecrc-red dark:text-jecrc-red-bright" />
                </div>
              </div>
            </GlassCard>
          </button>
        </div>

        {/* Today's Activity */}
        {data.stats?.todayTotal > 0 && (
          <div className="mb-6 p-4 rounded-lg border bg-jecrc-rose dark:bg-jecrc-red/10 border-jecrc-red/30 dark:border-jecrc-red/20">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-jecrc-red dark:text-jecrc-red-bright" />
              <h3 className="font-semibold text-jecrc-red dark:text-jecrc-red-bright">Your Today's Activity</h3>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              You processed <strong>{data.stats.todayTotal}</strong> application{data.stats.todayTotal !== 1 ? 's' : ''} today
              {' '}(<strong>{data.stats.todayApproved}</strong> approved, <strong>{data.stats.todayRejected}</strong> rejected)
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
             <input
                type="text"
                placeholder="Search by name or registration..."
                className="w-full pl-10 pr-4 py-3 min-h-[44px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red/40 focus:border-jecrc-red transition-all"
                onChange={(e) => setSearch(e.target.value)}
             />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 sm:gap-4 mb-6 border-b border-gray-200 dark:border-white/10 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-3 sm:px-4 min-h-[44px] font-medium text-sm sm:text-base transition-all duration-300 whitespace-nowrap ${
              activeTab === 'pending'
                ? 'border-b-2 border-jecrc-red text-jecrc-red dark:text-jecrc-red-bright'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            Pending ({data.stats?.pending || 0})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`pb-3 px-3 sm:px-4 min-h-[44px] font-medium text-sm sm:text-base transition-all duration-300 whitespace-nowrap ${
              activeTab === 'rejected'
                ? 'border-b-2 border-red-600 text-red-600 dark:text-red-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            My Rejected ({data.stats?.rejected || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-3 sm:px-4 min-h-[44px] font-medium text-sm sm:text-base transition-all duration-300 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-b-2 border-jecrc-red text-jecrc-red dark:text-jecrc-red-bright'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            My History ({data.stats?.total || 0})
          </button>
        </div>

        {/* Content Area */}
        <GlassCard className="overflow-hidden min-h-[500px]">
          {/* Pending Tab */}
          {activeTab === 'pending' && (
            loading ? (
              <div className="p-8 space-y-4">
                {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                {/* Mobile Scroll Hint */}
                <div className="md:hidden px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-center text-xs text-blue-600 dark:text-blue-400 border-b border-blue-100 dark:border-blue-800">
                  ← Swipe left/right to view all columns →
                </div>
                <table className="w-full text-left min-w-[640px]">
                  <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 sticky top-0">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Student</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Roll No</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Course</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Date</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm text-gray-600 dark:text-gray-300">
                    {filtered.length === 0 ? (
                        <tr><td colSpan="6" className="p-6 sm:p-8 text-center text-gray-400">
                          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          No pending requests
                        </td></tr>
                    ) : (
                        filtered.map((item) => (
                          <tr 
                            key={item.id} 
                            className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group" 
                            onClick={() => router.push(`/staff/student/${item.no_dues_forms.id}`)}
                          >
                            <td className="p-3 sm:p-4 font-medium text-gray-900 dark:text-white">{item.no_dues_forms.student_name}</td>
                            <td className="p-3 sm:p-4 font-mono text-xs sm:text-sm">{item.no_dues_forms.registration_no}</td>
                            <td className="p-3 sm:p-4 text-xs sm:text-sm">{item.no_dues_forms.course} - {item.no_dues_forms.branch}</td>
                            <td className="p-3 sm:p-4 text-xs sm:text-sm">{formatDate(item.no_dues_forms.created_at)}</td>
                            <td className="p-3 sm:p-4"><StatusBadge status={item.status} /></td>
                            <td className="p-3 sm:p-4 text-right">
                               <div className="flex justify-end gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button
                                    onClick={(e) => handleAction(e, item.no_dues_forms.id, item.department_name, 'approve')}
                                    className="p-2.5 min-h-[44px] min-w-[44px] bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/30 transition-all active:scale-95"
                                    title="Quick Approve"
                                  >
                                    <CheckCircle className="w-4 h-4"/>
                                  </button>
                                 <button
                                    onClick={(e) => {e.stopPropagation(); router.push(`/staff/student/${item.no_dues_forms.id}`)}}
                                    className="p-2.5 min-h-[44px] min-w-[44px] bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-all active:scale-95"
                                    title="View Details / Reject"
                                  >
                                    <XCircle className="w-4 h-4"/>
                                  </button>
                               </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Rejected Tab */}
          {activeTab === 'rejected' && (
            rejectedLoading ? (
              <div className="p-8 space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                {/* Mobile Scroll Hint */}
                <div className="md:hidden px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-center text-xs text-blue-600 dark:text-blue-400 border-b border-blue-100 dark:border-blue-800">
                  ← Swipe left/right to view all columns →
                </div>
                <table className="w-full text-left min-w-[580px]">
                  <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 sticky top-0">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Student</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Roll No</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Date</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm text-gray-600 dark:text-gray-300">
                    {filteredRejected.length === 0 ? (
                        <tr><td colSpan="4" className="p-6 sm:p-8 text-center text-gray-400">
                          <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          No rejected applications
                        </td></tr>
                    ) : (
                        filteredRejected.map((item) => (
                          <tr 
                            key={item.id} 
                            className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" 
                            onClick={() => router.push(`/staff/student/${item.no_dues_forms.id}`)}
                          >
                            <td className="p-3 sm:p-4 font-medium text-gray-900 dark:text-white">{item.no_dues_forms?.student_name}</td>
                            <td className="p-3 sm:p-4 font-mono text-xs sm:text-sm">{item.no_dues_forms?.registration_no}</td>
                            <td className="p-3 sm:p-4 text-xs sm:text-sm">{formatDate(item.action_at)}</td>
                            <td className="p-3 sm:p-4 text-xs sm:text-sm text-red-600 dark:text-red-400">{item.rejection_reason || '-'}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            historyLoading ? (
              <div className="p-8 space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                {/* Mobile Scroll Hint */}
                <div className="md:hidden px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-center text-xs text-blue-600 dark:text-blue-400 border-b border-blue-100 dark:border-blue-800">
                  ← Swipe left/right to view all columns →
                </div>
                <table className="w-full text-left min-w-[640px]">
                  <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 sticky top-0">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Student</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Roll No</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Action</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Date</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm text-gray-600 dark:text-gray-300">
                    {filteredHistory.length === 0 ? (
                        <tr><td colSpan="5" className="p-6 sm:p-8 text-center text-gray-400">
                          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          No action history yet
                        </td></tr>
                    ) : (
                        filteredHistory.map((item) => (
                          <tr 
                            key={item.id} 
                            className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" 
                            onClick={() => router.push(`/staff/student/${item.no_dues_forms.id}`)}
                          >
                            <td className="p-3 sm:p-4 font-medium text-gray-900 dark:text-white">{item.no_dues_forms?.student_name}</td>
                            <td className="p-3 sm:p-4 font-mono text-xs sm:text-sm">{item.no_dues_forms?.registration_no}</td>
                            <td className="p-3 sm:p-4">
                              {item.status === 'approved' 
                                ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium"><CheckCircle className="w-4 h-4"/> Approved</span>
                                : <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium"><XCircle className="w-4 h-4"/> Rejected</span>
                              }
                            </td>
                            <td className="p-3 sm:p-4 text-xs sm:text-sm">{formatDate(item.action_at)}</td>
                            <td className="p-3 sm:p-4 text-xs sm:text-sm">{item.rejection_reason || '-'}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            )
          )}
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
