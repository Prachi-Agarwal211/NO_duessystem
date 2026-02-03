'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Search,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Calendar,
  User,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AuditDashboard() {
  const { theme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const isDark = theme === 'dark';

  const [auditRecords, setAuditRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    department: 'all',
    dateRange: 'all',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      window.location.href = '/admin/login';
    }
  }, [user, authLoading]);

  // Load audit records
  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAuditRecords();
    }
  }, [user, currentPage, filters]);

  const loadAuditRecords = async () => {
    setLoading(true);
    try {
      if (!user || user.role !== 'admin') throw new Error('Unauthorized');

      // Build query
      let query = supabase
        .from('no_dues_status')
        .select(`
          *,
          no_dues_forms!inner(
            registration_no,
            student_name,
            personal_email,
            college_email,
            school,
            course,
            branch,
            created_at
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.department !== 'all') {
        query = query.eq('department_name', filters.department);
      }

      if (filters.search) {
        query = query.or(
          `no_dues_forms.registration_no.ilike.%${filters.search}%,no_dues_forms.student_name.ilike.%${filters.search}%`
        );
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (filters.dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }
        
        if (startDate) {
          query = query.gte('action_at', startDate.toISOString());
        }
      }

      // Get total count
      const { count, error: countError } = await query;
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Get paginated data
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: records, error: dataError } = await query
        .order('action_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (dataError) throw dataError;
      setAuditRecords(records || []);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('name')
      .eq('is_active', true)
      .order('name');
    return data?.map(d => d.name) || [];
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  const exportAuditData = () => {
    const csvContent = [
      [
        'Registration No',
        'Student Name',
        'Department',
        'Status',
        'Action By',
        'Action At',
        'Remarks',
        'Rejection Reason',
        'Form Created At'
      ].join(','),
      ...auditRecords.map(record => [
        record.no_dues_forms.registration_no,
        record.no_dues_forms.student_name,
        record.department_name,
        record.status,
        record.action_by || 'System',
        record.action_at || record.updated_at,
        record.remarks || '',
        record.rejection_reason || '',
        record.no_dues_forms.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if ((loading || authLoading) && auditRecords.length === 0) {
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
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Audit & History Dashboard
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                Complete approval/rejection history with pagination
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium
                  ${isDark
                    ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={exportAuditData}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl transition-all shadow-lg hover:shadow-green-600/25 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={loadAuditRecords}
                className={`p-2.5 rounded-xl border transition-all
                  ${isDark
                    ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Total Actions
                  </p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {totalCount}
                  </p>
                </div>
                <div className={`p-3 rounded-xl shadow-sm ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <FileText className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Approved
                  </p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {auditRecords.filter(r => r.status === 'approved').length}
                  </p>
                </div>
                <div className={`p-3 rounded-xl shadow-sm ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
                  <CheckCircle className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Rejected
                  </p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    {auditRecords.filter(r => r.status === 'rejected').length}
                  </p>
                </div>
                <div className={`p-3 rounded-xl shadow-sm ${isDark ? 'bg-red-500/20' : 'bg-red-50'}`}>
                  <XCircle className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Pending
                  </p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {auditRecords.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <div className={`p-3 rounded-xl shadow-sm ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
                  <Clock className={`w-6 h-6 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <GlassCard className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className={`w-full p-3 rounded-xl text-sm font-medium transition-all border
                          ${isDark
                            ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
                          }`}
                      >
                        <option value="all">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Department
                      </label>
                      <select
                        value={filters.department}
                        onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                        className={`w-full p-3 rounded-xl text-sm font-medium transition-all border
                          ${isDark
                            ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
                          }`}
                      >
                        <option value="all">All Departments</option>
                        <option value="library">Library</option>
                        <option value="accounts_department">Accounts</option>
                        <option value="hostel">Hostel</option>
                        <option value="it_department">IT Department</option>
                        <option value="school_hod">School HOD</option>
                        <option value="registrar">Registrar</option>
                        <option value="alumni_association">Alumni Association</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Date Range
                      </label>
                      <select
                        value={filters.dateRange}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                        className={`w-full p-3 rounded-xl text-sm font-medium transition-all border
                          ${isDark
                            ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
                          }`}
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Search
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={filters.search}
                          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                          placeholder="Search by name or reg no..."
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none text-sm font-medium transition-all
                            ${isDark
                              ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Audit Records Table */}
          <GlassCard>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b border-gray-200 dark:border-gray-700 ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action By
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action At
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <LoadingSpinner />
                      </td>
                    </tr>
                  ) : auditRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No audit records found
                      </td>
                    </tr>
                  ) : (
                    auditRecords.map((record) => (
                      <tr key={record.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}>
                        <td className="px-6 py-4">
                          <div>
                            <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {record.no_dues_forms.student_name}
                            </div>
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {record.no_dues_forms.registration_no}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Building className={`w-4 h-4 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {record.department_name?.replace('_', ' ') || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <User className={`w-4 h-4 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {record.action_by || 'System'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Calendar className={`w-4 h-4 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {record.action_at 
                                ? new Date(record.action_at).toLocaleDateString()
                                : new Date(record.updated_at).toLocaleDateString()
                              }
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowDetails(true);
                            }}
                            className={`p-2 rounded-lg transition-colors
                              ${isDark
                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > pageSize && (
              <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, i) => {
                      const totalPages = Math.ceil(totalCount / pageSize);
                      let pageNum;
                      
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / pageSize)))}
                    disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      currentPage >= Math.ceil(totalCount / pageSize)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Details Modal */}
          <AnimatePresence>
            {showDetails && selectedRecord && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                onClick={() => setShowDetails(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className={`w-full max-w-2xl rounded-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Audit Record Details
                    </h2>
                    <button
                      onClick={() => setShowDetails(false)}
                      className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Student Name</p>
                        <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedRecord.no_dues_forms.student_name}</p>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Registration No</p>
                        <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedRecord.no_dues_forms.registration_no}</p>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Department</p>
                        <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedRecord.department_name?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                        <StatusBadge status={selectedRecord.status} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Action By</p>
                        <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedRecord.action_by || 'System'}</p>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Action At</p>
                        <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {selectedRecord.action_at 
                            ? new Date(selectedRecord.action_at).toLocaleString()
                            : new Date(selectedRecord.updated_at).toLocaleString()
                          }
                        </p>
                      </div>
                    </div>

                    {selectedRecord.remarks && (
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Remarks</p>
                        <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedRecord.remarks}</p>
                      </div>
                    )}

                    {selectedRecord.rejection_reason && (
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rejection Reason</p>
                        <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedRecord.rejection_reason}</p>
                      </div>
                    )}

                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Student Details</p>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} space-y-1`}>
                        <p>Email: {selectedRecord.no_dues_forms.personal_email}</p>
                        <p>School: {selectedRecord.no_dues_forms.school}</p>
                        <p>Course: {selectedRecord.no_dues_forms.course}</p>
                        <p>Branch: {selectedRecord.no_dues_forms.branch}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}
