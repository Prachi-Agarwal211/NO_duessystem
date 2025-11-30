'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { supabase } from '@/lib/supabaseClient';
import { exportApplicationsToCSV, exportStatsToCSV } from '@/lib/csvExport';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import GlassCard from '@/components/ui/GlassCard';
import StatsCard from '@/components/admin/StatsCard';
import DepartmentPerformanceChart from '@/components/admin/DepartmentPerformanceChart';
import RequestTrendChart from '@/components/admin/RequestTrendChart';
import ApplicationsTable from '@/components/admin/ApplicationsTable';
import AdminSettings from '@/components/admin/settings/AdminSettings';
import { LogOut, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
  } = useAdminDashboard();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully');
      router.push('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle global errors with Toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentPage, statusFilter, departmentFilter, searchTerm]);

  const statusCounts = stats?.overallStats?.[0] || {};

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner text="Loading Dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Standalone Header */}
      <GlassCard className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-jecrc-red to-jecrc-red-dark flex items-center justify-center text-white shadow-lg shadow-jecrc-red/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              JECRC Admin
            </h1>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No Dues Management System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Tab Switcher */}
          <div className="flex p-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-jecrc-red text-black dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-jecrc-red text-black dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              Settings
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            {isLoggingOut ? (
              <LoadingSpinner size="sm" color="border-red-500" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Logout
          </button>
        </div>
      </GlassCard>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
            Overview
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="space-y-8 animate-fade-in">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              {stats?.departmentStats && <DepartmentPerformanceChart data={stats.departmentStats} />}
            </GlassCard>
            <GlassCard className="p-6">
              <RequestTrendChart userId={userId} />
            </GlassCard>
          </div>

          {/* Filter & Actions Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1 max-w-md">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search requests..."
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-jecrc-red outline-none"
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
                className="px-4 py-2 rounded-lg bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-jecrc-red outline-none"
              >
                <option value="">All Departments</option>
                <option value="LIBRARY">Library</option>
                <option value="HOSTEL">Hostel</option>
                <option value="IT_DEPARTMENT">IT Department</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  exportStatsToCSV(stats);
                  toast.success("Stats exported successfully");
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Export Stats
              </button>
              <button
                onClick={() => {
                  exportApplicationsToCSV(applications);
                  toast.success("Data exported successfully");
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Export Data
              </button>
            </div>
          </div>

          {/* Data Table */}
          <GlassCard className="overflow-hidden">
            <ApplicationsTable
              applications={applications}
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </GlassCard>
        </div>
      ) : (
        <GlassCard className="p-6 animate-fade-in">
          <AdminSettings />
        </GlassCard>
      )}
    </div>
  );
}
