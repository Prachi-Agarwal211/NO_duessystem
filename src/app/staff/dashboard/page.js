'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useStaffDashboard } from '@/hooks/useStaffDashboard';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlobalBackground from '@/components/ui/GlobalBackground';
import GlassCard from '@/components/ui/GlassCard';
import DataTable from '@/components/ui/DataTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import Logo from '@/components/ui/Logo';
import StatsCard from '@/components/staff/StatsCard';
import { SkeletonTable, SkeletonStats } from '@/components/ui/SkeletonLoader';
import ManualEntriesView from '@/components/staff/ManualEntriesView';
import SupportButton from '@/components/support/SupportButton';
import { RefreshCw, LogOut, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Calendar, Download, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { exportApplicationsToCSV } from '@/lib/csvExport';

function StaffDashboardContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // pending, rejected, history, manual-entries
  const [actionHistory, setActionHistory] = useState([]);
  const [rejectedForms, setRejectedForms] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // ⚡ PERFORMANCE: Cache flags to avoid re-fetching on tab switch
  const [historyFetched, setHistoryFetched] = useState(false);
  const [rejectedFetched, setRejectedFetched] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Use the real-time hook
  const {
    user,
    loading,
    refreshing,
    requests,
    stats,
    statsLoading,
    error,
    lastUpdate,
    fetchDashboardData,
    refreshData
  } = useStaffDashboard();

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data when debounced search term changes OR when returning to pending tab
  useEffect(() => {
    if (user && activeTab === 'pending') {
      console.log('📋 Fetching pending requests...');
      fetchDashboardData(debouncedSearchTerm);
    }
  }, [user, debouncedSearchTerm, activeTab, fetchDashboardData]);

  // Fetch action history - only once
  useEffect(() => {
    if (user && activeTab === 'history' && !historyFetched) {
      fetchActionHistory();
    }
  }, [user, activeTab, historyFetched]);

  // Fetch rejected forms - only once
  useEffect(() => {
    if (user && activeTab === 'rejected' && !rejectedFetched) {
      fetchRejectedForms();
    }
  }, [user, activeTab, rejectedFetched]);

  const fetchActionHistory = async () => {
    if (historyFetched) return; // Skip if already fetched
    
    setHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/staff/history?limit=50', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setActionHistory(result.data.history || []);
        setHistoryFetched(true); // Mark as fetched
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load action history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchRejectedForms = async () => {
    if (rejectedFetched) return; // Skip if already fetched
    
    setRejectedLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/staff/history?status=rejected&limit=100', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setRejectedForms(result.data.history || []);
        setRejectedFetched(true); // Mark as fetched
      }
    } catch (error) {
      console.error('Error fetching rejected forms:', error);
      toast.error('Failed to load rejected forms');
    } finally {
      setRejectedLoading(false);
    }
  };

  // Listen for new submission events and show toast
  useEffect(() => {
    const handleNewSubmission = (event) => {
      const { registrationNo, studentName } = event.detail;
      toast.success('New Application Received!', {
        description: `${studentName} (${registrationNo})`,
        duration: 5000,
      });
    };

    window.addEventListener('new-staff-submission', handleNewSubmission);
    return () => window.removeEventListener('new-staff-submission', handleNewSubmission);
  }, []);

  const handleRowClick = (row) => {
    router.push(`/staff/student/${row.id}`);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Logged out successfully');
      router.push('/staff/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
      setLoggingOut(false);
    }
  };

  // Handle CSV export for current tab
  const handleExportCSV = async () => {
    try {
      let dataToExport = [];
      let filename = '';

      if (activeTab === 'pending') {
        // Export pending requests
        dataToExport = requests.map(req => ({
          ...req,
          no_dues_status: [] // Pending requests don't have status yet
        }));
        filename = `pending_applications_${stats?.department || 'staff'}_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (activeTab === 'rejected') {
        // Export rejected forms
        dataToExport = rejectedForms.map(item => ({
          ...item.no_dues_forms,
          no_dues_status: [{
            status: 'rejected',
            rejection_reason: item.rejection_reason,
            action_at: item.action_at,
            profiles: { full_name: user?.full_name }
          }]
        }));
        filename = `rejected_applications_${stats?.department || 'staff'}_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (activeTab === 'history') {
        // Export action history
        dataToExport = actionHistory.map(item => ({
          ...item.no_dues_forms,
          no_dues_status: [{
            status: item.status,
            rejection_reason: item.rejection_reason,
            action_at: item.action_at,
            profiles: { full_name: user?.full_name }
          }]
        }));
        filename = `action_history_${stats?.department || 'staff'}_${new Date().toISOString().split('T')[0]}.csv`;
      }

      if (dataToExport.length === 0) {
        toast.error('No data to export');
        return;
      }

      // Use the existing CSV export function
      await exportApplicationsToCSV(dataToExport);
      toast.success(`Exported ${dataToExport.length} record(s)`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  // Table data for pending requests
  const tableHeaders = ['Student Name', 'Registration No', 'Course', 'Branch', 'Date'];
  const tableData = requests.map(request => ({
    'student_name': request.student_name,
    'registration_no': request.registration_no,
    'course': request.course || 'N/A',
    'branch': request.branch || 'N/A',
    'date': new Date(request.created_at).toLocaleDateString('en-IN'),
    'id': request.id
  }));

  // Table data for action history
  const historyHeaders = ['Student Name', 'Registration No', 'Action', 'Date', 'Reason'];
  const historyData = actionHistory.map(item => ({
    'student_name': item.no_dues_forms?.student_name || 'N/A',
    'registration_no': item.no_dues_forms?.registration_no || 'N/A',
    'action': item.status === 'approved' ? '✅ Approved' : '❌ Rejected',
    'date': item.action_at ? new Date(item.action_at).toLocaleDateString('en-IN') : 'N/A',
    'reason': item.rejection_reason || '-',
    'id': item.no_dues_forms?.id
  }));

  if (loading) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <GlobalBackground />
      <div className="relative z-10 min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <GlassCard>
            {/* Logo */}
            <div className="w-full flex justify-center mb-8 animate-fade-in">
              <Logo size="small" priority={true} />
            </div>

            {/* Header with Logout */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
              <div className="flex-1">
                <h1 className={`text-2xl sm:text-3xl font-bold font-futuristic-heading transition-all duration-700
                  ${isDark
                    ? 'bg-gradient-to-r from-white via-gray-100 via-pink-200 via-pink-300 to-jecrc-red bg-clip-text text-transparent [text-shadow:0_0_30px_rgba(255,255,255,0.3)]'
                    : 'bg-gradient-to-r from-[#8B0000] via-jecrc-red to-gray-800 to-gray-700 bg-clip-text text-transparent'
                  }`}>
                  {user?.role === 'admin' ? 'Admin Dashboard' : `${stats?.department || 'Department'} Dashboard`}
                </h1>
                <div className={`text-sm mt-2 transition-colors duration-700 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Welcome, {user?.full_name}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Real-time indicator */}
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-green-400' : 'bg-green-500'} animate-pulse`} />
                  <span className={`transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Live
                  </span>
                </div>

                {/* Support Button */}
                <SupportButton variant="header" />

                {/* Refresh Button */}
                <button
                  onClick={refreshData}
                  disabled={refreshing}
                  className={`interactive flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 min-h-[44px] min-w-[44px] ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                      : 'bg-gray-100 hover:bg-gray-200 text-ink-black border border-black/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Refresh data"
                  aria-label="Refresh data"
                >
                  <RefreshCw className={`w-4 h-4 flex-shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline whitespace-nowrap">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>

                {/* Export CSV Button */}
                <button
                  onClick={handleExportCSV}
                  disabled={
                    (activeTab === 'pending' && requests.length === 0) ||
                    (activeTab === 'rejected' && rejectedForms.length === 0) ||
                    (activeTab === 'history' && actionHistory.length === 0)
                  }
                  className={`interactive flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 min-h-[44px] min-w-[44px] ${
                    isDark
                      ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
                      : 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Export to CSV"
                  aria-label="Export to CSV"
                >
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">Export</span>
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={`interactive flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 min-h-[44px] min-w-[44px] ${
                    isDark
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">{loggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            </div>

            {/* Statistics Cards - Clickable with Smooth Scroll Animation */}
            {statsLoading ? (
              <div className="mb-8">
                <SkeletonStats count={4} />
              </div>
            ) : stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div
                  onClick={() => {
                    setActiveTab('pending');
                    // Smooth scroll to content section after tab switch
                    setTimeout(() => {
                      document.getElementById('content-section')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      });
                    }, 100);
                  }}
                  className="cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-95"
                  title="Click to view pending requests"
                >
                  <StatsCard
                    title="Pending Requests"
                    value={stats.pending || 0}
                    subtitle="Awaiting your action"
                    icon={Clock}
                    color="yellow"
                    loading={statsLoading}
                  />
                </div>
                
                <div
                  onClick={() => {
                    setActiveTab('history');
                    // Smooth scroll to content section after tab switch
                    setTimeout(() => {
                      document.getElementById('content-section')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      });
                    }, 100);
                  }}
                  className="cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-95"
                  title="Click to view approved applications"
                >
                  <StatsCard
                    title="My Approved"
                    value={stats.approved || 0}
                    subtitle="Applications you approved"
                    icon={CheckCircle}
                    color="green"
                    loading={statsLoading}
                  />
                </div>
                
                <div
                  onClick={() => {
                    setActiveTab('rejected');
                    // Smooth scroll to content section after tab switch
                    setTimeout(() => {
                      document.getElementById('content-section')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      });
                    }, 100);
                  }}
                  className="cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-95"
                  title="Click to view rejected applications"
                >
                  <StatsCard
                    title="My Rejected"
                    value={stats.rejected || 0}
                    subtitle="Applications you rejected"
                    icon={XCircle}
                    color="red"
                    loading={statsLoading}
                  />
                </div>
                
                <div
                  onClick={() => {
                    setActiveTab('history');
                    // Smooth scroll to content section after tab switch
                    setTimeout(() => {
                      document.getElementById('content-section')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      });
                    }, 100);
                  }}
                  className="cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-95"
                  title="Click to view action history"
                >
                  <StatsCard
                    title="My Total Actions"
                    value={stats.total || 0}
                    subtitle={stats.approvalRate ? `${stats.approvalRate}% your approval rate` : 'Your all time actions'}
                    icon={TrendingUp}
                    color="blue"
                    loading={statsLoading}
                  />
                </div>
              </div>
            )}

            {/* Today's Activity (if available) */}
            {stats?.todayTotal > 0 && (
              <div className={`mb-6 p-4 rounded-lg border transition-colors duration-700 ${
                isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <h3 className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    Your Today's Activity
                  </h3>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>You</strong> have processed <strong>{stats.todayTotal}</strong> application{stats.todayTotal !== 1 ? 's' : ''} today
                  {' '}(<strong>{stats.todayApproved}</strong> approved, <strong>{stats.todayRejected}</strong> rejected)
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div id="content-section" className="flex gap-4 mb-6 border-b scroll-mt-8 overflow-x-auto" style={{
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
            }}>
              <button
                onClick={() => setActiveTab('pending')}
                className={`pb-3 px-2 font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'pending'
                    ? isDark
                      ? 'border-b-2 border-blue-400 text-blue-400'
                      : 'border-b-2 border-blue-600 text-blue-600'
                    : isDark
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Pending Requests ({stats?.pending || 0})
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`pb-3 px-2 font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'rejected'
                    ? isDark
                      ? 'border-b-2 border-red-400 text-red-400'
                      : 'border-b-2 border-red-600 text-red-600'
                    : isDark
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Rejected Forms ({stats?.rejected || 0})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-3 px-2 font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'history'
                    ? isDark
                      ? 'border-b-2 border-blue-400 text-blue-400'
                      : 'border-b-2 border-blue-600 text-blue-600'
                    : isDark
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                My Action History
              </button>
              <button
                onClick={() => setActiveTab('manual-entries')}
                className={`pb-3 px-2 font-medium transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'manual-entries'
                    ? isDark
                      ? 'border-b-2 border-purple-400 text-purple-400'
                      : 'border-b-2 border-purple-600 text-purple-600'
                    : isDark
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                Manual Entries
              </button>
            </div>

            {/* Pending Requests Tab */}
            {activeTab === 'pending' && (
              <>
                <div className="mb-6 space-y-4">
                  <SearchBar
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search by name or registration number..."
                  />
                  
                  {/* Active Search Filter */}
                  {searchTerm && (
                    <div className={`flex items-center gap-2 flex-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="text-sm">Active filters:</span>
                      <button
                        onClick={() => setSearchTerm('')}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                          isDark
                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        Search: {searchTerm}
                        <span className="ml-1">×</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h2 className={`text-lg sm:text-xl font-semibold mb-4 font-futuristic-heading transition-all duration-700
                    ${isDark
                      ? 'bg-gradient-to-r from-white via-pink-200 to-jecrc-red bg-clip-text text-transparent'
                      : 'bg-gradient-to-r from-[#8B0000] to-jecrc-red bg-clip-text text-transparent'
                    }`}>
                    Pending Applications
                  </h2>

                  {loading ? (
                    <SkeletonTable rows={5} columns={5} />
                  ) : requests.length > 0 ? (
                    <DataTable
                      headers={tableHeaders}
                      data={tableData}
                      onRowClick={handleRowClick}
                    />
                  ) : (
                    <div className={`text-center py-12 transition-colors duration-700 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">
                        {debouncedSearchTerm ? 'No matching requests found' : 'No pending requests'}
                      </p>
                      <p className="text-sm">
                        {debouncedSearchTerm
                          ? 'Try adjusting your search terms'
                          : 'All applications have been processed. Great work!'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Rejected Forms Tab */}
            {activeTab === 'rejected' && (
              <div className="mb-4">
                <h2 className={`text-lg sm:text-xl font-semibold mb-4 font-futuristic-heading transition-all duration-700
                  ${isDark
                    ? 'bg-gradient-to-r from-white via-pink-200 to-red-400 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-[#8B0000] to-red-600 bg-clip-text text-transparent'
                  }`}>
                  Forms I Rejected
                </h2>

                {rejectedLoading ? (
                  <SkeletonTable rows={5} columns={5} />
                ) : rejectedForms.length > 0 ? (
                  <>
                    <div className={`mb-4 p-4 rounded-lg border transition-colors duration-700 ${
                      isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                        <h3 className={`font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                          Rejected Applications
                        </h3>
                      </div>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        These forms were rejected by you. Students can view the rejection reason and reapply with corrections.
                      </div>
                    </div>
                    <DataTable
                      headers={historyHeaders}
                      data={rejectedForms.map(item => ({
                        'student_name': item.no_dues_forms?.student_name || 'N/A',
                        'registration_no': item.no_dues_forms?.registration_no || 'N/A',
                        'action': '❌ Rejected',
                        'date': item.action_at ? new Date(item.action_at).toLocaleDateString('en-IN') : 'N/A',
                        'reason': item.rejection_reason || '-',
                        'id': item.no_dues_forms?.id
                      }))}
                      onRowClick={handleRowClick}
                    />
                  </>
                ) : (
                  <div className={`text-center py-12 transition-colors duration-700 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No rejected applications</p>
                    <p className="text-sm">
                      You haven't rejected any applications yet
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action History Tab */}
            {activeTab === 'history' && (
              <div className="mb-4">
                <h2 className={`text-lg sm:text-xl font-semibold mb-4 font-futuristic-heading transition-all duration-700
                  ${isDark
                    ? 'bg-gradient-to-r from-white via-pink-200 to-blue-400 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-[#8B0000] to-blue-600 bg-clip-text text-transparent'
                  }`}>
                  My Action History
                </h2>

                {historyLoading ? (
                  <SkeletonTable rows={5} columns={5} />
                ) : actionHistory.length > 0 ? (
                  <DataTable
                    headers={historyHeaders}
                    data={historyData}
                    onRowClick={handleRowClick}
                  />
                ) : (
                  <div className={`text-center py-12 transition-colors duration-700 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No action history yet</p>
                    <p className="text-sm">
                      Your approved and rejected applications will appear here
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Entries Tab */}
            {activeTab === 'manual-entries' && (
              <div className="mb-4">
                <ManualEntriesView />
              </div>
            )}

            {/* Last Updated Footer */}
            <div className={`text-xs text-center mt-6 pt-4 border-t transition-colors duration-700 ${
              isDark ? 'text-gray-500 border-white/10' : 'text-gray-400 border-black/10'
            }`}>
              Last updated: {lastUpdate.toLocaleString('en-IN')}
            </div>
          </GlassCard>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function StaffDashboard() {
  return (
    <ErrorBoundary>
      <StaffDashboardContent />
    </ErrorBoundary>
  );
}