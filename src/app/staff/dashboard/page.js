'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useStaffDashboard } from '@/hooks/useStaffDashboard';
import { exportAllStaffDataToCSV } from '@/lib/csvExport';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { RefreshCcw, Search, CheckCircle, XCircle, Clock, TrendingUp, Download, ChevronDown, LogOut, Info, AlertTriangle, User, HelpCircle, MessageCircle } from 'lucide-react';
import { getSLAStatus, getSLABadgeClasses } from '@/lib/slaHelper';
import { DEPARTMENT_GUIDELINES } from '@/lib/departmentGuidelines';
import toast from 'react-hot-toast';

export default function StaffDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  // Filters State
  const [filters, setFilters] = useState({
    course: 'All',
    branch: 'All'
  });

  // Bulk Selection State
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectFormId, setRejectFormId] = useState(null);
  const [rejectDeptName, setRejectDeptName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Local requests state for optimistic updates
  const [localRequests, setLocalRequests] = useState([]);

  // Hook Data
  const {
    user,
    loading,
    requests,
    stats,
    refreshData,
    lastUpdate
  } = useStaffDashboard();

  // Local state for other tabs
  const [rejectedForms, setRejectedForms] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);
  const [rejectedFetched, setRejectedFetched] = useState(false);

  // Unread messages for chat notification badges
  const [unreadMessages, setUnreadMessages] = useState({});

  // Effects
  useEffect(() => {
    // 🔔 REAL-TIME NOTIFICATIONS: Show toast alerts even if user is on another tab
    const handleNewSubmission = (e) => {
      const { studentName, registrationNo } = e.detail;
      toast.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">New Application Received!</p>
          <p className="text-xs opacity-90">{studentName} ({registrationNo})</p>
        </div>,
        {
          duration: 5000,
          icon: '📝',
          id: `new-sub-${registrationNo}` // Prevent duplicate toasts
        }
      );
    };

    const handleNewTicket = (e) => {
      const { ticketNumber, requesterType } = e.detail;
      toast.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">New Support Ticket!</p>
          <p className="text-xs opacity-90">Ticket #{ticketNumber} (${requesterType})</p>
        </div>,
        { duration: 5000, icon: '🎫' }
      );
    };

    window.addEventListener('new-submission', handleNewSubmission);
    window.addEventListener('support-ticket-created', handleNewTicket);

    return () => {
      window.removeEventListener('new-submission', handleNewSubmission);
      window.removeEventListener('support-ticket-created', handleNewTicket);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'rejected' && !rejectedFetched) fetchRejectedForms();
    if (activeTab === 'history' && !historyFetched) fetchHistory();
  }, [activeTab]);

  useEffect(() => {
    setHistoryFetched(false);
    setRejectedFetched(false);
    setSelectedItems(new Set()); // Clear selection on refresh
  }, [lastUpdate]);

  // Clear selection when tab changes
  useEffect(() => {
    setSelectedItems(new Set());
  }, [activeTab]);

  // Sync localRequests with requests from hook for optimistic updates
  useEffect(() => {
    setLocalRequests(requests);
  }, [requests]);

  // Fetch unread message counts for chat badges
  const fetchUnreadMessages = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/chat/unread', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          // Create a map of form_id -> unread_count
          const unreadMap = {};
          (result.data.counts || []).forEach(item => {
            unreadMap[item.form_id] = item.unread_count;
          });
          setUnreadMessages(unreadMap);
        }
      }
    } catch (err) {
      console.error('Error fetching unread messages:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadMessages();
  }, [fetchUnreadMessages, lastUpdate]);

  // 🔔 REALTIME: Subscribe to new chat messages for instant badge updates
  useEffect(() => {
    if (!user?.department_name) return;

    console.log('🔌 Staff Dashboard: Setting up chat message realtime listener');

    const channelName = `staff-chat-notifications-${user.department_name.replace(/\s+/g, '_')}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'no_dues_messages'
      }, (payload) => {
        // Only care about student messages to our department
        if (payload.new.sender_type === 'student' &&
          payload.new.department_name === user.department_name) {

          console.log('📨 New student message received:', payload.new);

          // Update unread count for this form
          setUnreadMessages(prev => ({
            ...prev,
            [payload.new.form_id]: (prev[payload.new.form_id] || 0) + 1
          }));

          // Show toast notification
          toast.success(
            <div className="flex flex-col gap-1">
              <p className="font-bold">💬 New Chat Message!</p>
              <p className="text-xs opacity-90">From: {payload.new.sender_name}</p>
            </div>,
            { duration: 4000, id: `chat-${payload.new.id}` }
          );
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Staff chat notifications subscribed');
        }
      });

    return () => {
      console.log('🧹 Staff Dashboard: Cleaning up chat notification listener');
      supabase.removeChannel(channel);
    };
  }, [user?.department_name]);

  // Data Fetching
  const fetchRejectedForms = async () => {
    setRejectedLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/staff/history?status=rejected&limit=100&t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) {
        setRejectedForms(json.data.history || []);
        setRejectedFetched(true);
      }
    } catch (e) { console.error(e); } finally { setRejectedLoading(false); }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/staff/history?limit=100&t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) {
        setHistoryData(json.data.history || []);
        setHistoryFetched(true);
      }
    } catch (e) { console.error(e); } finally { setHistoryLoading(false); }
  };

  // derived data for filters
  const uniqueCourses = useMemo(() => {
    const allData = [...requests, ...rejectedForms, ...historyData];
    const courses = new Set(allData.map(d => d.no_dues_forms?.course).filter(Boolean));
    return ['All', ...Array.from(courses)];
  }, [requests, rejectedForms, historyData]);

  const uniqueBranches = useMemo(() => {
    const allData = [...requests, ...rejectedForms, ...historyData];
    const branches = new Set(allData.map(d => d.no_dues_forms?.branch).filter(Boolean));
    return ['All', ...Array.from(branches)];
  }, [requests, rejectedForms, historyData]);

  // Filtering Logic
  const filterData = useCallback((data) => {
    return data.filter(item => {
      const form = item.no_dues_forms;
      const matchesSearch =
        form?.student_name.toLowerCase().includes(search.toLowerCase()) ||
        form?.registration_no.toLowerCase().includes(search.toLowerCase());

      const matchesCourse = filters.course === 'All' || form?.course === filters.course;
      const matchesBranch = filters.branch === 'All' || form?.branch === filters.branch;

      return matchesSearch && matchesCourse && matchesBranch;
    });
  }, [search, filters]);

  const currentData = useMemo(() => {
    if (activeTab === 'pending') return filterData(localRequests);
    if (activeTab === 'rejected') return filterData(rejectedForms);
    if (activeTab === 'history') return filterData(historyData);
    return [];
  }, [activeTab, localRequests, rejectedForms, historyData, filterData]);

  // Bulk Selection Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(new Set(currentData.map(item => item.no_dues_forms.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedItems(newSelected);
  };

  // Actions
  const handleBulkAction = async (action) => {
    console.log('🔵 handleBulkAction called:', { action, selectedCount: selectedItems.size, departmentName: user?.department_name });

    if (selectedItems.size === 0) {
      console.log('❌ No items selected');
      toast.error('No items selected');
      return;
    }

    if (!user?.department_name) {
      toast.error('Department not found. Please refresh the page.');
      console.error('❌ user.department_name is undefined:', user);
      return;
    }

    // Proceed directly with action - no popup confirmation
    setBulkActionLoading(true);
    toast.loading(`Processing ${selectedItems.size} items...`, { id: 'bulk-toast' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/staff/bulk-action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          formIds: Array.from(selectedItems),
          departmentName: user?.department_name,
          action
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success(json.message || 'Bulk action successful', { id: 'bulk-toast' });
      refreshData();
      setSelectedItems(new Set());
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Bulk action failed", { id: 'bulk-toast' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleAction = async (e, formId, departmentName, action) => {
    e.stopPropagation();

    // For REJECT: Open modal to get reason (one-by-one only)
    if (action === 'reject') {
      setRejectFormId(formId);
      setRejectDeptName(departmentName);
      setRejectionReason('');
      setShowRejectModal(true);
      return;
    }

    // For APPROVE: Quick action allowed
    toast.loading('Approving...', { id: 'action-toast' });

    // Optimistic update - remove from local state immediately
    setLocalRequests(prev => prev.filter(r => r.no_dues_forms.id !== formId));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ formId, departmentName, action })
      });
      if (!res.ok) {
        // Revert optimistic update on failure
        refreshData();
        throw new Error('Failed');
      }
      toast.success('Approved ✓', { id: 'action-toast' });
      // Background refresh to sync stats
      refreshData();
    } catch (err) {
      toast.error('Action failed', { id: 'action-toast' });
    }
  };

  // Handle rejection with reason (modal submit)
  const confirmRejection = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    setRejecting(true);
    toast.loading('Rejecting...', { id: 'reject-toast' });

    // Optimistic update
    setLocalRequests(prev => prev.filter(r => r.no_dues_forms.id !== rejectFormId));
    setShowRejectModal(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          formId: rejectFormId,
          departmentName: rejectDeptName,
          action: 'reject',
          reason: rejectionReason.trim()
        })
      });

      if (!res.ok) {
        refreshData();
        throw new Error('Failed');
      }

      toast.success('Rejected with reason', { id: 'reject-toast' });
      refreshData();
    } catch (err) {
      toast.error('Rejection failed', { id: 'reject-toast' });
    } finally {
      setRejecting(false);
      setRejectFormId(null);
      setRejectDeptName('');
      setRejectionReason('');
    }
  };

  const handleExport = async () => {
    toast.loading('Fetching all records for export...', { id: 'export-toast' });

    try {
      const success = await exportAllStaffDataToCSV(
        {
          activeTab,
          course: filters.course,
          branch: filters.branch,
          search
        },
        user?.department_name,
        supabase
      );

      if (success) {
        toast.success('Export completed successfully!', { id: 'export-toast' });
      } else {
        toast.error('No data to export', { id: 'export-toast' });
      }
    } catch (error) {
      toast.error('Export failed. Please try again.', { id: 'export-toast' });
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try { return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return 'Invalid'; }
  };

  return (
    <PageWrapper>
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen relative pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {user?.department_name || 'Department'} Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="px-2.5 py-1 bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Live</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowGuide(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" /> Guidelines
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => router.push('/staff/profile')}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded-xl transition-all active:scale-95"
              title="My Profile"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={refreshData}
              className="p-2.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl shadow-lg shadow-jecrc-red/20 transition-all active:scale-95"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/staff/login');
              }}
              className="p-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded-xl transition-all active:scale-95"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Guidelines Modal */}
        {showGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10">
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  {user?.department_name} Guidelines
                </h2>
                <button
                  onClick={() => setShowGuide(false)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Checklist for Approval</h3>
                <ul className="space-y-3">
                  {(DEPARTMENT_GUIDELINES[user?.department_name] || DEPARTMENT_GUIDELINES['default']).map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-right">
                <button
                  onClick={() => setShowGuide(false)}
                  className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-black font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Guidelines Card */}
        <div className="mb-6 p-4 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex-shrink-0">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Quick Guidelines</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span>Approve students with no pending dues</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <span>Reject with valid reason for reapplication</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Clock className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                  <span>Process pending requests within 24-48 hours</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                  <span>Verify student details before taking action</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatusCard
            label="Pending"
            value={stats?.pending || 0}
            sub="Awaiting action"
            icon={Clock}
            color="yellow"
            onClick={() => setActiveTab('pending')}
          />
          <StatusCard
            label="My Approved"
            value={stats?.approved || 0}
            sub="By you"
            icon={CheckCircle}
            color="green"
            onClick={() => setActiveTab('history')}
          />
          <StatusCard
            label="My Rejected"
            value={stats?.rejected || 0}
            sub="By you"
            icon={XCircle}
            color="red"
            onClick={() => setActiveTab('rejected')}
          />
          <StatusCard
            label="Total Processed"
            value={stats?.total || 0}
            sub={`${stats?.approvalRate || 0}% approval rate`}
            icon={TrendingUp}
            color="rose"
            onClick={() => setActiveTab('history')}
          />
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search student..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-jecrc-red/40"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-jecrc-red/40"
                value={filters.course}
                onChange={(e) => setFilters(prev => ({ ...prev, course: e.target.value }))}
              >
                {uniqueCourses.map(c => <option key={c} value={c}>{c === 'All' ? 'All Courses' : c}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-jecrc-red/40"
                value={filters.branch}
                onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value }))}
              >
                {uniqueBranches.map(b => <option key={b} value={b}>{b === 'All' ? 'All Branches' : b}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-white/10">
          {['pending', 'rejected', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 capitalize font-medium text-sm transition-all border-b-2 
                ${activeTab === tab
                  ? 'border-jecrc-red text-jecrc-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab} ({tab === 'pending' ? stats?.pending : tab === 'rejected' ? stats?.rejected : stats?.total})
            </button>
          ))}
        </div>

        {/* Main Table */}
        <GlassCard className="overflow-hidden min-h-[400px]">
          {loading || rejectedLoading || historyLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* MOBILE VIEW cards (< 768px) */}
              <div className="block md:hidden bg-gray-50 dark:bg-black/20 p-4">
                {currentData.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">No records found</div>
                ) : (
                  currentData.map(item => (
                    <MobileCard
                      key={item.id}
                      item={item}
                      activeTab={activeTab}
                      selected={selectedItems.has(item.no_dues_forms.id)}
                      onSelect={() => handleSelectItem(item.no_dues_forms.id)}
                      onAction={handleAction}
                      onNavigate={() => router.push(`/staff/student/${item.no_dues_forms.id}`)}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>

              {/* DESKTOP VIEW Table (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                    <tr>
                      {/* Checkbox Column for Bulk Actions (Only on Pending Tab) */}
                      {activeTab === 'pending' && (
                        <th className="w-12 px-4 py-3">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 text-jecrc-red focus:ring-jecrc-red"
                              checked={currentData.length > 0 && selectedItems.size === currentData.length}
                              onChange={handleSelectAll}
                            />
                          </div>
                        </th>
                      )}
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Student</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Course / Branch</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Date</th>
                      {activeTab === 'pending' && <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">SLA</th>}
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Status</th>
                      {(activeTab === 'pending' || activeTab === 'rejected') && <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm text-gray-600 dark:text-gray-300">
                    {currentData.length === 0 ? (
                      <tr><td colSpan="6" className="p-12 text-center text-gray-400">No records found</td></tr>
                    ) : (
                      currentData.map(item => (
                        <tr
                          key={item.id}
                          className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${selectedItems.has(item.no_dues_forms.id) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                          onClick={() => router.push(`/staff/student/${item.no_dues_forms.id}`)}
                        >
                          {activeTab === 'pending' && (
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-300 text-jecrc-red focus:ring-jecrc-red"
                                checked={selectedItems.has(item.no_dues_forms.id)}
                                onChange={() => handleSelectItem(item.no_dues_forms.id)}
                              />
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{item.no_dues_forms.student_name}</div>
                                <div className="text-xs text-gray-500 font-mono">{item.no_dues_forms.registration_no}</div>
                              </div>
                              {/* Unread message badge */}
                              {unreadMessages[item.no_dues_forms.id] > 0 && (
                                <span
                                  className="flex items-center gap-1 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full animate-pulse"
                                  title={`${unreadMessages[item.no_dues_forms.id]} unread message(s)`}
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  {unreadMessages[item.no_dues_forms.id]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900 dark:text-white">{item.no_dues_forms.course}</div>
                            <div className="text-xs text-gray-500">{item.no_dues_forms.branch}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(item.no_dues_forms.created_at)}</td>
                          {activeTab === 'pending' && (
                            <td className="px-4 py-3">
                              {(() => {
                                const sla = getSLAStatus(item.no_dues_forms.created_at);
                                if (sla.level === 'normal') return <span className="text-xs text-gray-400">{sla.text}</span>;
                                return (
                                  <span className={getSLABadgeClasses(sla, true)} title={sla.text}>
                                    {sla.level === 'warning' && '⚠️'}
                                    {sla.level === 'slow' && '🐌'}
                                    {sla.level === 'critical' && '🚨'}
                                    {sla.text}
                                  </span>
                                );
                              })()}
                            </td>
                          )}
                          <td className="px-4 py-3"><StatusBadge status={item.status} /></td>

                          {/* Individual Actions */}
                          {activeTab === 'pending' && (
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={(e) => handleAction(e, item.no_dues_forms.id, item.department_name, 'approve')}
                                  className="p-2 text-green-600 bg-green-100 dark:bg-green-500/20 rounded-lg hover:bg-green-200"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => handleAction(e, item.no_dues_forms.id, item.department_name, 'reject')}
                                  className="p-2 text-red-600 bg-red-100 dark:bg-red-500/20 rounded-lg hover:bg-red-200"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}

                          {/* Rejected Tab Actions - Allow Approve after resolution */}
                          {activeTab === 'rejected' && (
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={(e) => handleAction(e, item.no_dues_forms.id, item.department_name, 'approve')}
                                  className="px-3 py-1.5 text-green-600 bg-green-100 dark:bg-green-500/20 rounded-lg hover:bg-green-200 text-xs font-medium flex items-center gap-1"
                                  title="Approve (Resolved)"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Approve
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`/staff/student/${item.no_dues_forms.id}`) }}
                                  className="px-3 py-1.5 text-blue-600 bg-blue-100 dark:bg-blue-500/20 rounded-lg hover:bg-blue-200 text-xs font-medium flex items-center gap-1"
                                  title="View & Chat"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  Chat
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </GlassCard>

        {/* Bulk Action Bar (Floating) */}
        {selectedItems.size > 0 && activeTab === 'pending' && (
          <div className="fixed bottom-6 left-0 right-0 max-w-2xl mx-auto px-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 flex items-center justify-between ring-1 ring-black/5">
              <div className="flex items-center gap-3">
                <div className="bg-jecrc-red text-white text-xs font-bold px-2 py-1 rounded-md">
                  {selectedItems.size}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Selected</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBulkAction('approve')}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-green-600/20 flex items-center gap-2"
                >
                  {bulkActionLoading ? <span className="animate-spin text-xl">⟳</span> : <CheckCircle className="w-4 h-4" />}
                  Approve Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Reject Application
              </h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Please provide a reason for rejection. This will be sent to the student.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                autoFocus
              />
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setRejectFormId(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejection}
                disabled={!rejectionReason.trim() || rejecting}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {rejecting ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

// Status Card Component
function StatusCard({ label, value, sub, icon: Icon, color, onClick }) {
  const colors = {
    yellow: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-500/20",
    green: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-500/20",
    red: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-500/20",
    rose: "text-jecrc-red bg-jecrc-red/10 dark:text-jecrc-red-bright dark:bg-jecrc-red/20"
  };

  return (
    <button onClick={onClick} className="text-left transform transition-all hover:scale-[1.02] active:scale-95 w-full">
      <GlassCard className="p-4 sm:p-5 h-full">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">{value || 0}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
          <div className={`p-3 rounded-xl ${colors[color]}`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </GlassCard>
    </button>
  );
}

// Mobile Card Component for Data Items
function MobileCard({ item, activeTab, selected, onSelect, onAction, onNavigate, formatDate }) {
  const sla = activeTab === 'pending' ? getSLAStatus(item.no_dues_forms.created_at) : null;

  return (
    <div
      onClick={onNavigate}
      className={`bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition-all ${selected ? 'ring-2 ring-jecrc-red bg-red-50 dark:bg-red-900/10' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          {activeTab === 'pending' && (
            <div onClick={(e) => e.stopPropagation()} className="pt-1">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-jecrc-red focus:ring-jecrc-red"
                checked={selected}
                onChange={onSelect}
              />
            </div>
          )}
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              {item.no_dues_forms.student_name}
            </h3>
            <span className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded mt-1 font-mono">
              {item.no_dues_forms.registration_no}
            </span>
          </div>
        </div>
        <StatusBadge status={item.status} className="scale-90 origin-top-right" />
      </div>

      <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div>
          <span className="text-gray-400 text-xs block">Course</span>
          {item.no_dues_forms.course}
        </div>
        <div className="text-right">
          <span className="text-gray-400 text-xs block">Date</span>
          {formatDate(item.no_dues_forms.created_at)}
        </div>
      </div>

      {activeTab === 'pending' && sla && (
        <div className="flex items-center gap-2 mb-4 bg-gray-50 dark:bg-black/20 p-2 rounded-lg">
          <span className="text-xs text-gray-500 font-medium">SLA:</span>
          <span className={`text-xs ${getSLABadgeClasses(sla).split(' ').filter(c => c.startsWith('text-')).join(' ')} font-bold`}>
            {sla.text}
          </span>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-white/5" onClick={e => e.stopPropagation()}>
          <button
            onClick={(e) => onAction(e, item.no_dues_forms.id, item.department_name, 'approve')}
            className="flex-1 py-2 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Approve
          </button>
          <button
            onClick={(e) => onAction(e, item.no_dues_forms.id, item.department_name, 'reject')}
            className="flex-1 py-2 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" /> Reject
          </button>
        </div>
      )}
    </div>
  );
}
