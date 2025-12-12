'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Clock,
  CheckCircle,
  TrendingUp,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  FileCheck,
  XCircle
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ConvocationDashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State management
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination & filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Available schools for filter
  const [schools, setSchools] = useState([]);

  // Fetch statistics
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/convocation/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
        // Extract schools for filter dropdown
        if (data.data.schoolDistribution) {
          setSchools(Object.keys(data.data.schoolDistribution));
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch students list
  const fetchStudents = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (schoolFilter !== 'all') {
        params.append('school', schoolFilter);
      }
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`/api/convocation/list?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setStudents(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalStudents(data.pagination.total);
        setCurrentPage(data.pagination.page);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchStudents(1);
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchStudents(1);
  }, [statusFilter, schoolFilter, searchQuery]);

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('convocation_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'convocation_eligible_students'
        },
        (payload) => {
          console.log('Convocation status changed:', payload);
          // Refresh data when changes occur
          fetchStats();
          fetchStudents(currentPage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchStudents(currentPage)]);
    setRefreshing(false);
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  // Handle export to CSV
  const handleExport = () => {
    if (students.length === 0) return;

    const headers = ['Registration No', 'Name', 'School', 'Admission Year', 'Status'];
    const csvData = students.map(student => [
      student.registration_no,
      student.student_name,
      student.school,
      student.admission_year,
      student.convocation_status
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `convocation_students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      not_started: { bg: 'bg-gray-500/20', text: 'text-gray-500', icon: Clock, label: 'Not Started' },
      pending_online: { bg: 'bg-blue-500/20', text: 'text-blue-500', icon: Clock, label: 'Pending Online' },
      pending_manual: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', icon: FileCheck, label: 'Pending Manual' },
      completed_online: { bg: 'bg-green-500/20', text: 'text-green-500', icon: CheckCircle, label: 'Completed Online' },
      completed_manual: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', icon: CheckCircle, label: 'Completed Manual' }
    };

    const config = statusConfig[status] || statusConfig.not_started;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // Statistics card component
  const StatCard = ({ title, value, icon: Icon, color, percentage }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-xl backdrop-blur-md transition-all duration-700 ${
        isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-white border border-black/10 hover:shadow-lg'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm mb-1 transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {title}
          </p>
          <h3 className={`text-3xl font-bold mb-2 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'}`}>
            {value.toLocaleString()}
          </h3>
          {percentage !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className={`w-4 h-4 ${color}`} />
              <span className={color}>{percentage}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-')}/10`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold mb-2 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'}`}>
            🎓 9th Convocation Dashboard
          </h1>
          <p className={`text-sm transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Track convocation eligibility and clearance status for all 3,181 students
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isDark
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-ink-black'
          } disabled:opacity-50`}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      {statsLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Eligible"
            value={stats.total}
            icon={Users}
            color="text-blue-500"
          />
          <StatCard
            title="Not Started"
            value={stats.statusCounts.not_started || 0}
            icon={Clock}
            color="text-gray-500"
          />
          <StatCard
            title="Pending Clearance"
            value={(stats.statusCounts.pending_online || 0) + (stats.statusCounts.pending_manual || 0)}
            icon={FileCheck}
            color="text-yellow-500"
          />
          <StatCard
            title="Completed"
            value={(stats.statusCounts.completed_online || 0) + (stats.statusCounts.completed_manual || 0)}
            icon={CheckCircle}
            color="text-green-500"
            percentage={Math.round(stats.completionRate * 100)}
          />
        </div>
      )}

      {/* Filters & Search */}
      <div className={`p-4 rounded-xl transition-all duration-700 ${
        isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-black/10'
      }`}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or registration number..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all duration-700 ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder-gray-500'
                    : 'bg-gray-50 border-black/10 text-ink-black placeholder-gray-400'
                }`}
              />
            </div>
          </form>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border transition-all duration-700 ${
              isDark
                ? 'bg-white/5 border-white/10 text-white'
                : 'bg-gray-50 border-black/10 text-ink-black'
            }`}
          >
            <option value="all">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="pending_online">Pending Online</option>
            <option value="pending_manual">Pending Manual</option>
            <option value="completed_online">Completed Online</option>
            <option value="completed_manual">Completed Manual</option>
          </select>

          {/* School Filter */}
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border transition-all duration-700 ${
              isDark
                ? 'bg-white/5 border-white/10 text-white'
                : 'bg-gray-50 border-black/10 text-ink-black'
            }`}
          >
            <option value="all">All Schools</option>
            {schools.map(school => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={students.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isDark
                ? 'bg-jecrc-red/20 hover:bg-jecrc-red/30 text-jecrc-red'
                : 'bg-jecrc-red text-white hover:bg-red-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : students.length === 0 ? (
        <div className={`p-12 rounded-xl text-center transition-all duration-700 ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
        }`}>
          <GraduationCap className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            No students found matching your filters
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className={`rounded-xl overflow-hidden transition-all duration-700 ${
            isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-black/10'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`transition-all duration-700 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Registration No
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Name
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      School
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Year
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {students.map((student, index) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`transition-all duration-700 ${
                        isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${
                        isDark ? 'text-white' : 'text-ink-black'
                      }`}>
                        {student.registration_no}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        isDark ? 'text-white' : 'text-ink-black'
                      }`}>
                        {student.student_name}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="max-w-xs truncate" title={student.school}>
                          {student.school}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {student.admission_year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <StatusBadge status={student.convocation_status} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Showing <span className="font-medium">{((currentPage - 1) * 50) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * 50, totalStudents)}</span> of{' '}
              <span className="font-medium">{totalStudents}</span> students
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchStudents(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-all ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-30'
                    : 'bg-gray-100 hover:bg-gray-200 text-ink-black disabled:opacity-30'
                } disabled:cursor-not-allowed`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className={`px-4 py-2 text-sm font-medium ${isDark ? 'text-white' : 'text-ink-black'}`}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => fetchStudents(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-all ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-30'
                    : 'bg-gray-100 hover:bg-gray-200 text-ink-black disabled:opacity-30'
                } disabled:cursor-not-allowed`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}