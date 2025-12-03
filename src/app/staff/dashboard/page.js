'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useStaffDashboard } from '@/hooks/useStaffDashboard';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import DataTable from '@/components/ui/DataTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import Logo from '@/components/ui/Logo';
import StatsCard from '@/components/staff/StatsCard';
import { RefreshCw, LogOut, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // pending, history
  const [actionHistory, setActionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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

  // Fetch data when debounced search term changes
  useEffect(() => {
    if (user && activeTab === 'pending') {
      fetchDashboardData(debouncedSearchTerm);
    }
  }, [user, debouncedSearchTerm, activeTab, fetchDashboardData]);

  // Fetch action history
  useEffect(() => {
    if (user && activeTab === 'history') {
      fetchActionHistory();
    }
  }, [user, activeTab]);

  const fetchActionHistory = async () => {
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
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load action history');
    } finally {
      setHistoryLoading(false);
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
      <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <GlassCard>
            {/* Logo */}
            <div className="w-full flex justify-center mb-8 animate-fade-in">
              <Logo size="small" priority={true} />
            </div>

            {/* Header with Logout */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
              <div className="flex-1">
                <h1 className={`text-2xl sm:text-3xl font-bold transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
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

                {/* Refresh Button */}
                <button
                  onClick={refreshData}
                  disabled={refreshing}
                  className={`interactive flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                      : 'bg-gray-100 hover:bg-gray-200 text-ink-black border border-black/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Refresh data"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={`interactive flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    isDark
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{loggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatsCard
                  title="Pending Requests"
                  value={stats.pending || 0}
                  subtitle="Awaiting your action"
                  icon={Clock}
                  color="yellow"
                  loading={statsLoading}
                />
                <StatsCard
                  title="Approved"
                  value={stats.approved || 0}
                  subtitle="Successfully approved"
                  icon={CheckCircle}
                  color="green"
                  loading={statsLoading}
                />
                <StatsCard
                  title="Rejected"
                  value={stats.rejected || 0}
                  subtitle="Applications rejected"
                  icon={XCircle}
                  color="red"
                  loading={statsLoading}
                />
                <StatsCard
                  title="Total Processed"
                  value={stats.total || 0}
                  subtitle={stats.approvalRate ? `${stats.approvalRate}% approval rate` : 'All time'}
                  icon={TrendingUp}
                  color="blue"
                  loading={statsLoading}
                />
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
                    Today's Activity
                  </h3>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  You have processed <strong>{stats.todayTotal}</strong> applications today
                  ({stats.todayApproved} approved, {stats.todayRejected} rejected)
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-6 border-b" style={{
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
            }}>
              <button
                onClick={() => setActiveTab('pending')}
                className={`pb-3 px-2 font-medium transition-all duration-300 ${
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
                onClick={() => setActiveTab('history')}
                className={`pb-3 px-2 font-medium transition-all duration-300 ${
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
            </div>

            {/* Pending Requests Tab */}
            {activeTab === 'pending' && (
              <>
                <div className="mb-6">
                  <SearchBar
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search by name or registration number..."
                  />
                </div>

                <div className="mb-4">
                  <h2 className={`text-lg sm:text-xl font-semibold mb-4 transition-colors duration-700 ${
                    isDark ? 'text-white' : 'text-ink-black'
                  }`}>
                    Pending Applications
                  </h2>

                  {requests.length > 0 ? (
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

            {/* Action History Tab */}
            {activeTab === 'history' && (
              <div className="mb-4">
                <h2 className={`text-lg sm:text-xl font-semibold mb-4 transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>
                  My Action History
                </h2>

                {historyLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner />
                  </div>
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