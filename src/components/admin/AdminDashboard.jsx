'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import StatsCard from '@/components/admin/StatsCard';
import DepartmentPerformanceChart from '@/components/admin/DepartmentPerformanceChart';
import RequestTrendChart from '@/components/admin/RequestTrendChart';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    fetchUserData();
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

  const getStatusCounts = () => {
    if (!stats?.overallStats || stats.overallStats.length === 0) return null;
    return stats.overallStats[0];
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchTerm || 
      app.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.registration_no.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const tableHeaders = ['Student Name', 'Registration No', 'Course', 'Status', 'Submitted', 'Response Time', 'Actions'];

  const tableData = filteredApplications.map(app => ({
    'student_name': app.student_name,
    'registration_no': app.registration_no,
    'course': app.course || 'N/A',
    'status': <StatusBadge status={app.status} />,
    'submitted': new Date(app.created_at).toLocaleDateString(),
    'response_time': app.total_response_time || 'N/A',
    'actions': (
      <button
        onClick={() => window.location.href = `/admin/request/${app.id}`}
        className="text-blue-500 hover:underline"
      >
        View Details
      </button>
    )
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-300 mb-4">Error Loading Dashboard</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 mt-2">Monitor and manage all no-dues requests</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Welcome, {user?.full_name}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {stats?.departmentStats && (
            <DepartmentPerformanceChart data={stats.departmentStats} />
          )}
          <RequestTrendChart />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by student name or registration..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Departments</option>
            <option value="LIBRARY">Library</option>
            <option value="HOSTEL">Hostel</option>
            <option value="IT_DEPARTMENT">IT Department</option>
            <option value="REGISTRAR">Registrar</option>
            {/* Add more departments as needed */}
          </select>
          <div className="text-sm text-gray-400 flex items-center">
            Showing {filteredApplications.length} of {totalItems} requests
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <DataTable
              headers={tableHeaders}
              data={tableData}
              className="w-full min-w-full"
            />
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {stats?.recentActivity && stats.recentActivity.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <ul className="space-y-3">
                {stats.recentActivity.slice(0, 5).map((activity, index) => (
                  <li key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                    <div>
                      <span className="font-medium">{activity.student_name}</span> - {activity.department_name}
                    </div>
                    <div className="text-sm text-gray-400">
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
  );
}