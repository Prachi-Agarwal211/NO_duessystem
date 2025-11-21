'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import PageWrapper from '@/components/landing/PageWrapper';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import StatsCard from '@/components/admin/StatsCard';
import DepartmentPerformanceChart from '@/components/admin/DepartmentPerformanceChart';
import RequestTrendChart from '@/components/admin/RequestTrendChart';
import Logo, { LogoIcon } from '@/components/ui/Logo';

export default function AdminDashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState('');
  const [activeReport, setActiveReport] = useState('');
  const [reportData, setReportData] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Fetch user data only on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  // Fetch dashboard data and stats when filters change
  useEffect(() => {
    fetchDashboardData();
    fetchStats();
  }, [currentPage, statusFilter, departmentFilter, searchTerm]);

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || userData.role !== 'admin') {
        window.location.href = '/unauthorized';
        return;
      }

      setUser(userData);
      setUserId(session.user.id);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error.message);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        throw new Error('Session expired. Please login again.');
      }

      const params = new URLSearchParams({
        userId: session.user.id,
        page: currentPage,
        limit: 20,
        status: statusFilter,
        search: searchTerm,
        department: departmentFilter
      });

      const response = await fetch(`/api/admin/dashboard?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      setApplications(result.applications || []);
      setTotalItems(result.pagination?.total || 0);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        console.error('No session available for stats fetch');
        return;
      }

      const response = await fetch(`/api/admin/stats?userId=${session.user.id}`);
      const result = await response.json();

      if (response.ok) {
        setStats(result);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchReport = async (reportType) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/reports?userId=${session.user.id}&type=${reportType}`);
      const result = await response.json();

      if (response.ok) {
        setReportData(result.data);
        setActiveReport(reportType);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const exportToCSV = () => {
    if (applications.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare CSV headers
    const headers = ['Student Name', 'Registration No', 'Course', 'Overall Status', 'Submitted Date'];

    // Add department columns
    const departments = ['LIBRARY', 'HOSTEL', 'IT_DEPARTMENT'];
    departments.forEach(dept => {
      headers.push(`${dept} Status`, `${dept} Response Time`, `${dept} Action By`);
    });

    // Prepare CSV rows
    const rows = applications.map(app => {
      const row = [
        app.student_name,
        app.registration_no,
        app.course || 'N/A',
        app.status,
        new Date(app.created_at).toLocaleDateString()
      ];

      // Add department status for each department
      departments.forEach(deptName => {
        const deptStatus = app.no_dues_status?.find(d => d.department_name === deptName);
        if (deptStatus) {
          row.push(
            deptStatus.status || 'N/A',
            deptStatus.response_time || 'N/A',
            deptStatus.profiles?.full_name || 'N/A'
          );
        } else {
          row.push('N/A', 'N/A', 'N/A');
        }
      });

      return row;
    });

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `no_dues_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportStatsToCSV = () => {
    if (!stats) {
      alert('No stats data available');
      return;
    }

    const headers = ['Metric', 'Value'];
    const statusCounts = getStatusCounts();

    const rows = [
      ['Total Requests', statusCounts?.total_requests || 0],
      ['Completed Requests', statusCounts?.completed_requests || 0],
      ['Pending Requests', statusCounts?.pending_requests || 0],
      ['Rejected Requests', statusCounts?.rejected_requests || 0],
      ['Completion Rate', `${((statusCounts?.completed_requests / Math.max(statusCounts?.total_requests, 1)) * 100).toFixed(1)}%`]
    ];

    // Add department performance
    if (stats.departmentStats) {
      rows.push(['', '']); // Empty row
      rows.push(['Department Performance', '']);
      stats.departmentStats.forEach(dept => {
        rows.push([dept.department_name, `${dept.approval_rate}% approval rate`]);
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `no_dues_stats_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleRowExpansion = (appId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };

  const getDepartmentStatusSummary = (departmentStatuses) => {
    const approved = departmentStatuses.filter(d => d.status === 'approved').length;
    const pending = departmentStatuses.filter(d => d.status === 'pending').length;
    const rejected = departmentStatuses.filter(d => d.status === 'rejected').length;
    const total = departmentStatuses.length;

    return { approved, pending, rejected, total };
  };

  const getStatusCounts = () => {
    if (!stats?.overallStats || stats.overallStats.length === 0) return null;
    return stats.overallStats[0];
  };

  // Enhanced table with department status breakdown
  const renderDepartmentStatusBadges = (departmentStatuses) => {
    const summary = getDepartmentStatusSummary(departmentStatuses);

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {summary.approved > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            ✓ {summary.approved}
          </span>
        )}
        {summary.pending > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            ⏱ {summary.pending}
          </span>
        )}
        {summary.rejected > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            ✗ {summary.rejected}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-lg p-6 text-center backdrop-blur-md transition-all duration-700 ${isDark
            ? 'bg-red-900/20 border border-red-500/50'
            : 'bg-red-50 border border-red-200'
            }`}>
            <h2 className={`text-xl font-bold mb-4 transition-colors duration-700 ${isDark ? 'text-red-300' : 'text-red-700'
              }`}>
              Error Loading Dashboard
            </h2>
            <p className={`mb-6 transition-colors duration-700 ${isDark ? 'text-red-400' : 'text-red-600'
              }`}>
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 min-h-[44px] bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-300"
            >
              Retry
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <PageWrapper>
      <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-bold transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                }`}>
                Admin Dashboard
              </h1>
              <p className={`mt-2 transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                Monitor and manage all no-dues requests
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`text-sm transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                Welcome, {user?.full_name}
              </div>
              <button
                onClick={exportStatsToCSV}
                className="px-4 py-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white font-medium transition-all duration-300 flex items-center gap-2"
              >
                📊 Export Stats
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 min-h-[44px] bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white font-medium transition-all duration-300 flex items-center gap-2"
              >
                📥 Export Data
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white font-medium transition-all duration-300"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <StatsCard
              title="Total Requests"
              value={statusCounts?.total_requests || 0}
              change={statusCounts ? `+${(statusCounts.total_requests - (statusCounts.total_requests || 0) + 100)}%` : '0%'}
              trend="up"
              color="bg-blue-500"
            />
            <StatsCard
              title="Completed"
              value={statusCounts?.completed_requests || 0}
              change={statusCounts ? `+${(statusCounts.completed_requests / Math.max(statusCounts.total_requests, 1) * 100).toFixed(1)}%` : '0%'}
              trend="up"
              color="bg-green-500"
            />
            <StatsCard
              title="Pending"
              value={statusCounts?.pending_requests || 0}
              change={statusCounts ? `-${((statusCounts.pending_requests / Math.max(statusCounts.total_requests, 1) * 100)).toFixed(1)}%` : '0%'}
              trend="down"
              color="bg-yellow-500"
            />
            <StatsCard
              title="Rejected"
              value={statusCounts?.rejected_requests || 0}
              change={statusCounts ? `-${((statusCounts.rejected_requests / Math.max(statusCounts.total_requests, 1) * 100)).toFixed(1)}%` : '0%'}
              trend="down"
              color="bg-red-500"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
            {stats?.departmentStats && (
              <DepartmentPerformanceChart data={stats.departmentStats} />
            )}
            <RequestTrendChart userId={userId} />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by student name or registration..."
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-4 py-2 min-h-[44px] rounded-lg focus:ring-2 focus:ring-jecrc-red focus:outline-none transition-all duration-300 ${isDark
                ? 'bg-gray-800 border border-gray-700 text-white'
                : 'bg-white border border-gray-300 text-ink-black'
                }`}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className={`px-4 py-2 min-h-[44px] rounded-lg focus:ring-2 focus:ring-jecrc-red focus:outline-none transition-all duration-300 ${isDark
                ? 'bg-gray-800 border border-gray-700 text-white'
                : 'bg-white border border-gray-300 text-ink-black'
                }`}
            >
              <option value="">All Departments</option>
              <option value="LIBRARY">Library</option>
              <option value="HOSTEL">Hostel</option>
              <option value="IT_DEPARTMENT">IT Department</option>
            </select>
            <div className={`text-sm flex items-center transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
              Showing {applications.length} of {totalItems} requests
            </div>
          </div>

          {/* Enhanced Applications Table with Department Status */}
          <div className={`rounded-xl border overflow-hidden backdrop-blur-sm transition-all duration-700 ${isDark
            ? 'bg-gray-800/50 border-gray-700'
            : 'bg-white border-gray-200 shadow-sm'
            }`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Expand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Reg. No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Course</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Overall Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Dept. Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Submitted</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {applications.map((app) => {
                    const isExpanded = expandedRows.has(app.id);
                    return (
                      <React.Fragment key={app.id}>
                        <tr className={isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => toggleRowExpansion(app.id)}
                              className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                                }`}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </td>
                          <td className="px-4 py-4 text-sm font-medium">{app.student_name}</td>
                          <td className="px-4 py-4 text-sm">{app.registration_no}</td>
                          <td className="px-4 py-4 text-sm">{app.course || 'N/A'}</td>
                          <td className="px-4 py-4">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="px-4 py-4">
                            {renderDepartmentStatusBadges(app.no_dues_status || [])}
                          </td>
                          <td className="px-4 py-4 text-sm">{new Date(app.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-4 text-sm">
                            <button
                              onClick={() => window.location.href = `/admin/request/${app.id}`}
                              className="text-jecrc-red hover:underline font-medium"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="8" className={`px-4 py-4 ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm mb-3">Department-wise Status:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {app.no_dues_status?.map((dept, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-3 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                                        }`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm">{dept.department_name}</span>
                                        <StatusBadge status={dept.status} />
                                      </div>
                                      <div className={`text-xs space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {dept.profiles?.full_name && (
                                          <div>By: {dept.profiles.full_name}</div>
                                        )}
                                        {dept.action_at && (
                                          <div>On: {new Date(dept.action_at).toLocaleDateString()}</div>
                                        )}
                                        {dept.response_time && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-blue-500">⏱</span>
                                            <span className="font-medium">Response Time: {dept.response_time}</span>
                                          </div>
                                        )}
                                        {dept.rejection_reason && (
                                          <div className="text-red-500 mt-1">Reason: {dept.rejection_reason}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={`flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-3 transition-colors duration-700 ${isDark ? 'border-gray-700' : 'border-gray-200'
              }`}>
              <div className={`text-sm transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 min-h-[44px] rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-ink-black'
                    }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 min-h-[44px] rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-ink-black'
                    }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {stats?.recentActivity && stats.recentActivity.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <h2 className={`text-xl font-semibold mb-4 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                }`}>
                Recent Activity
              </h2>
              <div className={`rounded-xl border p-6 backdrop-blur-sm transition-all duration-700 ${isDark
                ? 'bg-gray-800/50 border-gray-700'
                : 'bg-white border-gray-200 shadow-sm'
                }`}>
                <ul className="space-y-3">
                  {stats.recentActivity.slice(0, 5).map((activity, index) => (
                    <li key={index} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 border-b last:border-b-0 gap-2 transition-colors duration-700 ${isDark ? 'border-gray-700' : 'border-gray-200'
                      }`}>
                      <div className={`transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-900'
                        }`}>
                        <span className="font-medium">{activity.student_name}</span> - {activity.department_name}
                      </div>
                      <div className={`text-sm transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        {new Date(activity.action_at).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}