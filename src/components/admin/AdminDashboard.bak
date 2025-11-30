'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { exportApplicationsToCSV, exportStatsToCSV } from '@/lib/csvExport';
import PageWrapper from '@/components/landing/PageWrapper';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import StatsCard from '@/components/admin/StatsCard';
import DepartmentPerformanceChart from '@/components/admin/DepartmentPerformanceChart';
import RequestTrendChart from '@/components/admin/RequestTrendChart';
import ApplicationsTable from '@/components/admin/ApplicationsTable';
import Logo from '@/components/ui/Logo';
import AdminSettings from '@/components/admin/settings/AdminSettings';

export default function AdminDashboard() {
  const { theme } = useTheme();
  // ✅ Handle null theme safely (defaults to dark mode)
  const isDark = theme === 'dark' || theme === null;

  const {
    user,
    userId,
    loading,
    applications,
    stats,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    fetchDashboardData,
    fetchStats,
    handleLogout
  } = useAdminDashboard();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Fetch data when filters change
  useEffect(() => {
    if (userId) {
      fetchDashboardData({
        status: statusFilter,
        search: searchTerm,
        department: departmentFilter
      });
      fetchStats();
    }
    // ✅ Include fetchDashboardData and fetchStats in dependencies
    // Using exhaustive-deps disable comment to acknowledge we're intentionally
    // not including these functions to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentPage, statusFilter, departmentFilter, searchTerm]);

  const statusCounts = stats?.overallStats?.[0] || {};

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
          <div className={`max-w-md w-full rounded-lg p-6 text-center backdrop-blur-md transition-all duration-700 ${
            isDark ? 'bg-red-900/20 border border-red-500/50' : 'bg-red-50 border border-red-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 transition-colors duration-700 ${
              isDark ? 'text-red-300' : 'text-red-700'
            }`}>
              Error Loading Dashboard
            </h2>
            <p className={`mb-6 transition-colors duration-700 ${
              isDark ? 'text-red-400' : 'text-red-600'
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

  return (
    <PageWrapper>
      <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Centered Logo - University Crest */}
          <div className="w-full flex justify-center mb-8 animate-fade-in">
            <Logo size="small" priority={true} />
          </div>

          {/* Header */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-bold transition-colors duration-700 ${
                isDark ? 'text-white' : 'text-ink-black'
              }`}>
                Admin Dashboard
              </h1>
              <p className={`mt-2 transition-colors duration-700 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {activeTab === 'dashboard' ? 'Monitor and manage all no-dues requests' : 'Configure system settings'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`text-sm transition-colors duration-700 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Welcome, {user?.full_name}
              </div>
              {activeTab === 'dashboard' && (
                <>
                  <button
                    onClick={() => exportStatsToCSV(stats)}
                    className="px-4 py-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white font-medium transition-all duration-300 flex items-center gap-2"
                  >
                    📊 Export Stats
                  </button>
                  <button
                    onClick={() => exportApplicationsToCSV(applications)}
                    className="px-4 py-2 min-h-[44px] bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white font-medium transition-all duration-300 flex items-center gap-2"
                  >
                    📥 Export Data
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white font-medium transition-all duration-300"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={`mb-6 rounded-xl border backdrop-blur-sm transition-all duration-700 ${
            isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className="flex gap-2 p-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'dashboard'
                    ? 'bg-jecrc-red text-white shadow-lg'
                    : isDark
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    : 'text-gray-600 hover:text-ink-black hover:bg-gray-100'
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'settings'
                    ? 'bg-jecrc-red text-white shadow-lg'
                    : isDark
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    : 'text-gray-600 hover:text-ink-black hover:bg-gray-100'
                }`}
              >
                ⚙️ Settings
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'dashboard' ? (
            <>
              {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <StatsCard
              title="Total Requests"
              value={statusCounts.total_requests || 0}
              change={statusCounts ? `+${(statusCounts.total_requests || 0)}` : '0'}
              trend="up"
              color="bg-blue-500"
            />
            <StatsCard
              title="Completed"
              value={statusCounts.completed_requests || 0}
              change={statusCounts ? `${((statusCounts.completed_requests / Math.max(statusCounts.total_requests, 1)) * 100).toFixed(1)}%` : '0%'}
              trend="up"
              color="bg-green-500"
            />
            <StatsCard
              title="Pending"
              value={statusCounts.pending_requests || 0}
              change={statusCounts ? `${((statusCounts.pending_requests / Math.max(statusCounts.total_requests, 1)) * 100).toFixed(1)}%` : '0%'}
              trend="down"
              color="bg-yellow-500"
            />
            <StatsCard
              title="Rejected"
              value={statusCounts.rejected_requests || 0}
              change={statusCounts ? `${((statusCounts.rejected_requests / Math.max(statusCounts.total_requests, 1)) * 100).toFixed(1)}%` : '0%'}
              trend="down"
              color="bg-red-500"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
            {stats?.departmentStats && <DepartmentPerformanceChart data={stats.departmentStats} />}
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
              className={`px-4 py-2 min-h-[44px] rounded-lg focus:ring-2 focus:ring-jecrc-red focus:outline-none transition-all duration-300 ${
                isDark ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-white border border-gray-300 text-ink-black'
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
              className={`px-4 py-2 min-h-[44px] rounded-lg focus:ring-2 focus:ring-jecrc-red focus:outline-none transition-all duration-300 ${
                isDark ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-white border border-gray-300 text-ink-black'
              }`}
            >
              <option value="">All Departments</option>
              <option value="LIBRARY">Library</option>
              <option value="HOSTEL">Hostel</option>
              <option value="IT_DEPARTMENT">IT Department</option>
            </select>
            <div className={`text-sm flex items-center transition-colors duration-700 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Showing {applications.length} of {totalItems} requests
            </div>
          </div>

          {/* Applications Table */}
          <ApplicationsTable
            applications={applications}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
          />

          {/* Recent Activity */}
          {stats?.recentActivity && stats.recentActivity.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <h2 className={`text-xl font-semibold mb-4 transition-colors duration-700 ${
                isDark ? 'text-white' : 'text-ink-black'
              }`}>
                Recent Activity
              </h2>
              <div className={`rounded-xl border p-6 backdrop-blur-sm transition-all duration-700 ${
                isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <ul className="space-y-3">
                  {stats.recentActivity.slice(0, 5).map((activity, index) => (
                    <li
                      key={index}
                      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 border-b last:border-b-0 gap-2 transition-colors duration-700 ${
                        isDark ? 'border-gray-700' : 'border-gray-200'
                      }`}
                    >
                      <div className={`transition-colors duration-700 ${
                        isDark ? 'text-gray-300' : 'text-gray-900'
                      }`}>
                        <span className="font-medium">{activity.student_name}</span> - {activity.department_name}
                      </div>
                      <div className={`text-sm transition-colors duration-700 ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {new Date(activity.action_at).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
            </>
          ) : (
            <AdminSettings />
          )}
        </div>
      </div>
    </PageWrapper>
  );
}