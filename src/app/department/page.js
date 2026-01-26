'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ChatBox from '@/components/chat/ChatBox';
import optimizedRealtime from '@/lib/optimizedRealtime';

/**
 * Department Dashboard Component
 * 
 * Features:
 * - Table management with select all functionality
 * - Bulk operations (approve/reject)
 * - Real-time status updates
 * - Advanced filtering and sorting
 * - Export functionality
 * - Chat integration
 * - Priority queue management
 */

export default function DepartmentDashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    priority: 'all',
    dateRange: 'all'
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'created_at',
    direction: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Get current user info
  const [currentUser, setCurrentUser] = useState(null);
  const [departmentName, setDepartmentName] = useState('');

  // Load applications
  const loadApplications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user profile to determine department
      const { data: profile } = await supabase
        .from('profiles')
        .select('department_name, full_name')
        .eq('email', user.email)
        .single();

      if (!profile) throw new Error('Profile not found');

      setCurrentUser({
        id: user.id,
        email: user.email,
        name: profile.full_name,
        type: 'department'
      });
      setDepartmentName(profile.department_name);

      // Load applications for this department
      const { data: forms, error: formsError } = await supabase
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status!inner(
            status,
            action_at,
            action_by,
            remarks,
            rejection_reason
          )
        `)
        .eq('no_dues_status.department_name', profile.department_name)
        .order('created_at', { ascending: false });

      if (formsError) throw formsError;

      setApplications(forms || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Optimized Real-time updates
  useEffect(() => {
    console.log(`🔌 Setting up optimized department real-time connection for ${departmentName}`);

    const unsubscribe = optimizedRealtime.subscribe('department', {
      departmentName: departmentName,
      onDepartmentUpdate: (payload) => {
        console.log(`🏢 Department ${departmentName}: Status update`, payload);
        // Update specific item in state instead of full reload
        if (payload.new && payload.new.form_id) {
          setApplications(prev => prev.map(app =>
            app.id === payload.new.form_id
              ? { ...app, no_dues_status: [{ ...app.no_dues_status[0], status: payload.new.status }] }
              : app
          ));
        } else {
          loadApplications();
        }
      },
      onNewApplication: (payload) => {
        console.log(`📝 Department ${departmentName}: New application`, payload);
        // Prepend new application to state
        if (payload.new) {
          // We fetch full data for the new application to ensure nested status is correct
          // but we do it silently for just ONE item
          fetch(`/api/student/application?id=${payload.new.id}`)
            .then(res => res.json())
            .then(json => {
              if (json.success && json.data) {
                setApplications(prev => [json.data, ...prev]);
                toast.success(`New application: ${json.data.student_name}`);
              }
            }).catch(() => loadApplications());
        } else {
          loadApplications();
        }
      },
      onConnectionChange: (status) => {
        setIsConnected(status === 'SUBSCRIBED');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [departmentName]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
    } else {
      setSelectedRows(applications.map(app => app.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle row selection
  const handleRowSelect = (id) => {
    setSelectedRows(prev => {
      if (prev.includes(id)) {
        return prev.filter(rowId => rowId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    if (selectedRows.length === 0) {
      alert('Please select at least one application');
      return;
    }

    try {
      const results = await Promise.all(
        selectedRows.map(rowId =>
          fetch('/api/department-action', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              form_id: rowId,
              status: action,
              department: departmentName,
              remarks: action === 'reject' ? 'Bulk rejection' : 'Bulk approval'
            })
          })
        )
      );

      const allSuccessful = results.every(res => res.ok);

      if (allSuccessful) {
        setSelectedRows([]);
        setSelectAll(false);
        loadApplications();
        alert(`Successfully ${action}d ${selectedRows.length} applications`);
      } else {
        alert('Some actions failed. Please try again.');
      }
    } catch (err) {
      alert('Failed to perform bulk action');
    }
  };

  // Individual action
  const handleAction = async (application, action) => {
    try {
      const response = await fetch('/api/department-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          form_id: application.id,
          status: action,
          department: departmentName,
          remarks: action === 'reject' ? prompt('Rejection reason:') : null
        })
      });

      const data = await response.json();

      if (data.success) {
        loadApplications();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      alert('Failed to perform action');
    }
  };

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      ['Registration No', 'Student Name', 'Status', 'Created At', 'Department'].join(','),
      ...applications.map(app => [
        app.registration_no,
        app.student_name,
        app.no_dues_status[0]?.status || 'pending',
        app.created_at,
        departmentName
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${departmentName}_applications_${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Sorting
  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    if (filters.status !== 'all') {
      const status = app.no_dues_status[0]?.status;
      if (status !== filters.status) return false;
    }
    if (filters.search && !app.student_name.toLowerCase().includes(filters.search.toLowerCase()) &&
      !app.registration_no.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  // Sort applications
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Status badge component
  const StatusBadge = ({ status }) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
      reapplied: 'bg-orange-100 text-orange-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  // Priority indicator
  const PriorityIndicator = ({ priority, isReapplied }) => {
    if (isReapplied) {
      return (
        <div className="flex items-center space-x-1">
          <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
          <span className="text-orange-600 font-medium">Priority</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center space-x-1 text-gray-500`}>
        <AlertTriangle className="w-4 h-4" />
        <span className="capitalize">Normal</span>
      </div>
    );
  };

  if (loading && applications.length === 0) {
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className={`
                text-2xl sm:text-3xl font-bold font-serif transition-all duration-700
                ${isDark
                  ? 'bg-gradient-to-r from-jecrc-red-bright via-jecrc-red to-white bg-clip-text text-transparent [text-shadow:0_0_30px_rgba(196,30,58,0.3)]'
                  : 'bg-gradient-to-r from-jecrc-red-dark via-jecrc-red to-gray-800 bg-clip-text text-transparent'
                }
              `}>
                {departmentName} Dashboard
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-100'}`}>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className={`text-xs font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Live Updates</span>
                </div>
                <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Real-time synchronization enabled
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all active:scale-95 shadow-sm font-semibold
                  ${isDark
                    ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-5 py-2.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl transition-all font-bold shadow-lg shadow-jecrc-red/20 active:scale-95 text-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={loadApplications}
                className={`p-2.5 rounded-xl border-2 transition-all active:scale-95 shadow-sm
                  ${isDark
                    ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-1">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status Filter</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className={`w-full p-3 rounded-xl border-2 outline-none font-semibold transition-all
                          ${isDark
                          ? 'bg-black/40 border-white/10 text-white focus:border-jecrc-red-bright'
                          : 'bg-white border-gray-200 text-gray-900 focus:border-jecrc-red'
                        }`}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="reapplied">Reapplied</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Search Records</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        placeholder="Search by student name or registration number..."
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none font-semibold transition-all
                            ${isDark
                            ? 'bg-black/40 border-white/10 text-white focus:border-jecrc-red-bright'
                            : 'bg-white border-gray-200 text-gray-900 focus:border-jecrc-red'
                          }`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <GlassCard variant="elegant" className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Applications</p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{applications.length}</p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <Filter className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
              </div>
            </GlassCard>
            <GlassCard variant="elegant" className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pending Review</p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {applications.filter(app => (app.no_dues_status?.[0]?.status || app.status) === 'pending').length}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                  <Clock className={`w-6 h-6 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
              </div>
            </GlassCard>
            <GlassCard variant="elegant" className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Approved</p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {applications.filter(app => (app.no_dues_status?.[0]?.status || app.status) === 'approved').length}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                  <CheckCircle className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
              </div>
            </GlassCard>
            <GlassCard variant="elegant" className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>High Priority</p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                    {applications.filter(app => app.status === 'reapplied' || app.priority === 'urgent').length}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                  <AlertTriangle className={`w-6 h-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Bulk Actions */}
          {selectedRows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-800 dark:text-blue-200 font-medium">
                    {selectedRows.length} application{selectedRows.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBulkAction('approved')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('rejected')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject Selected
                  </button>
                  <button
                    onClick={() => setSelectedRows([])}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Applications Table */}
          <GlassCard>
            {/* MOBILE VIEW cards (< 768px) */}
            <div className="block md:hidden bg-gray-50 dark:bg-black/20 p-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-white/5 rounded-lg animate-pulse" />)}
                </div>
              ) : sortedApplications.length === 0 ? (
                <div className="text-center py-10 text-gray-400">No applications found</div>
              ) : (
                sortedApplications.map((application) => (
                  <MobileApplicationCard
                    key={application.id}
                    application={application}
                    selected={selectedRows.includes(application.id)}
                    onSelect={() => handleRowSelect(application.id)}
                    onApprove={() => handleAction(application, 'approved')}
                    onReject={() => handleAction(application, 'rejected')}
                    onChat={() => {
                      setSelectedApplication(application);
                      setShowChat(true);
                    }}
                    onViewDetails={() => alert(`View details for ${application.registration_no}`)}
                    isDark={isDark}
                  />
                ))
              )}
            </div>

            {/* DESKTOP VIEW Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left cursor-pointer" onClick={() => handleSort('registration_no')}>
                      <div className="flex items-center space-x-1">
                        <span>Registration No</span>
                        {sortConfig.field === 'registration_no' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left cursor-pointer" onClick={() => handleSort('student_name')}>
                      <div className="flex items-center space-x-1">
                        <span>Student Name</span>
                        {sortConfig.field === 'student_name' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Priority</th>
                    <th className="px-6 py-3 text-left cursor-pointer" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center space-x-1">
                        <span>Created</span>
                        {sortConfig.field === 'created_at' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center">
                        <LoadingSpinner />
                      </td>
                    </tr>
                  ) : sortedApplications.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No applications found
                      </td>
                    </tr>
                  ) : (
                    sortedApplications.map((application) => (
                      <tr key={application.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(application.id)}
                            onChange={() => handleRowSelect(application.id)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {application.registration_no}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {application.student_name}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={application.no_dues_status[0]?.status || 'pending'} />
                        </td>
                        <td className="px-6 py-4">
                          <PriorityIndicator
                            priority={application.priority}
                            isReapplied={application.status === 'reapplied'}
                          />
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {new Date(application.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleAction(application, 'approved')}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(application, 'rejected')}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApplication(application);
                                setShowChat(true);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                // View details
                                alert(`View details for ${application.registration_no}`);
                              }}
                              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Chat Modal */}
        <AnimatePresence>
          {showChat && selectedApplication && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1050]"
              onClick={() => setShowChat(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <ChatBox
                  messages={chatMessages}
                  loading={false}
                  sending={sendingMessage}
                  onSend={async (message, senderType, senderName) => {
                    setSendingMessage(true);
                    try {
                      // Send message logic here
                      console.log('Sending message:', message);
                    } finally {
                      setSendingMessage(false);
                    }
                  }}
                  currentUserType={currentUser?.type}
                  currentUserName={currentUser?.name}
                  departmentName={departmentName}
                  rejectionReason={selectedApplication.no_dues_status[0]?.rejection_reason}
                  onFileUpload={async (file) => {
                    // File upload logic here
                    console.log('Uploading file:', file);
                    return { success: true, fileUrl: 'https://example.com/file' };
                  }}
                  isConnected={isConnected}
                  typingUsers={typingUsers}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper >
  );
}

// Mobile Card Component for Applications
function MobileApplicationCard({ application, selected, onSelect, onApprove, onReject, onChat, onViewDetails, isDark }) {
  const status = application.no_dues_status?.[0]?.status || 'pending';
  const isReapplied = application.status === 'reapplied';

  const statusColors = {
    pending: {
      bg: 'bg-yellow-50 dark:bg-yellow-500/10',
      border: 'border-yellow-200 dark:border-yellow-500/20',
      badge: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
      icon: 'text-yellow-500'
    },
    approved: {
      bg: 'bg-green-50 dark:bg-green-500/10',
      border: 'border-green-200 dark:border-green-500/20',
      badge: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
      icon: 'text-green-500'
    },
    rejected: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      border: 'border-red-200 dark:border-red-500/20',
      badge: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
      icon: 'text-red-500'
    },
    in_progress: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-500/20',
      badge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
      icon: 'text-blue-500'
    },
    completed: {
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      border: 'border-purple-200 dark:border-purple-500/20',
      badge: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
      icon: 'text-purple-500'
    }
  };

  const colors = statusColors[status] || statusColors.pending;

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 mb-3 border transition-all ${selected
        ? 'ring-2 ring-jecrc-red bg-red-50/50 dark:bg-red-900/10 border-jecrc-red/50'
        : `${colors.bg} ${colors.border}`
        }`}
    >
      {/* Gradient accent on top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-jecrc-red to-jecrc-red-bright opacity-50`} />

      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div onClick={(e) => e.stopPropagation()} className="pt-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="w-5 h-5 rounded border-gray-300 text-jecrc-red focus:ring-jecrc-red cursor-pointer"
            />
          </div>
          <div>
            <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {application.student_name}
            </h3>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono mt-1 ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
              {application.registration_no}
            </span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${colors.badge}`}>
          {status.replace('_', ' ')}
        </span>
      </div>

      {/* Info Row */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} block`}>Created</span>
          <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            {new Date(application.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div>
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} block`}>Priority</span>
          <div className="flex items-center gap-1">
            {isReapplied ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                <span className="text-orange-600 dark:text-orange-400 font-medium text-xs">High Priority</span>
              </>
            ) : (
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Normal</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex gap-2 pt-2 border-t border-gray-200/50 dark:border-white/5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onApprove}
          className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md"
        >
          <CheckCircle className="w-4 h-4" /> Approve
        </button>
        <button
          onClick={onReject}
          className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md"
        >
          <XCircle className="w-4 h-4" /> Reject
        </button>
        <button
          onClick={onChat}
          className="p-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg hover:shadow-md transition-all"
          title="Chat"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          onClick={onViewDetails}
          className={`p-2.5 rounded-lg transition-all ${isDark
            ? 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900'
            }`}
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
