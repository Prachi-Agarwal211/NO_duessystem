'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useStaffDashboard } from '@/hooks/useStaffDashboard';
import { exportAllStaffDataToCSV } from '@/lib/csvExport';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { RefreshCcw, Search, CheckCircle, XCircle, Clock, TrendingUp, Download, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');

  // Filters State
  const [filters, setFilters] = useState({
    course: 'All',
    branch: 'All'
  });

  // Bulk Selection State
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

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

  // Effects
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
    if (activeTab === 'pending') return filterData(requests);
    if (activeTab === 'rejected') return filterData(rejectedForms);
    if (activeTab === 'history') return filterData(historyData);
    return [];
  }, [activeTab, requests, rejectedForms, historyData, filterData]);

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
    if (selectedItems.size === 0) return;
    if (!confirm(`Are you sure you want to ${action} ${selectedItems.size} items?`)) return;

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
    toast.loading('Processing...', { id: 'action-toast' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ formId, departmentName, action, reason: "Quick Action" })
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(action === 'approve' ? 'Approved ✓' : 'Rejected', { id: 'action-toast' });
      refreshData();
    } catch (err) {
      toast.error("Action failed", { id: 'action-toast' });
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
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={refreshData}
              className="p-3 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl shadow-lg shadow-jecrc-red/20 transition-all active:scale-95"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
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
            <div className="overflow-x-auto">
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
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Status</th>
                    {activeTab === 'pending' && <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500 text-right">Actions</th>}
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
                          <div className="font-medium text-gray-900 dark:text-white">{item.no_dues_forms.student_name}</div>
                          <div className="text-xs text-gray-500 font-mono">{item.no_dues_forms.registration_no}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 dark:text-white">{item.no_dues_forms.course}</div>
                          <div className="text-xs text-gray-500">{item.no_dues_forms.branch}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(item.no_dues_forms.created_at)}</td>
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
                                onClick={(e) => { e.stopPropagation(); router.push(`/staff/student/${item.no_dues_forms.id}`) }}
                                className="p-2 text-red-600 bg-red-100 dark:bg-red-500/20 rounded-lg hover:bg-red-200"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
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
    </PageWrapper>
  );
}

// Stats Card Component for cleaner code
function StatusCard({ label, value, sub, icon: Icon, color, onClick }) {
  const colors = {
    yellow: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-500/20",
    green: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-500/20",
    red: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-500/20",
    rose: "text-jecrc-red bg-jecrc-red/10 dark:text-jecrc-red-bright dark:bg-jecrc-red/20"
  };

  return (
    <button onClick={onClick} className="text-left transform transition-all hover:scale-[1.02] active:scale-95">
      <GlassCard className="p-4 sm:p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
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
