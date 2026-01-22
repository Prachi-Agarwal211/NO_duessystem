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
        console.log(`🏢 Department ${departmentName}: Status update`);
        loadApplications();
      },
      onNewApplication: (payload) => {
        console.log(`📝 Department ${departmentName}: New application`);
        loadApplications();
      },
      onConnectionChange: (status) => {
        console.log(`📡 Department ${departmentName} connection status:`, status);
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
          <GlassCard className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {departmentName} Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage no-dues applications and status updates
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={loadApplications}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
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
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        placeholder="Search by name or registration..."
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Statistics Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{applications.length}</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                  <Filter className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {applications.filter(app => app.no_dues_status[0]?.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {applications.filter(app => app.no_dues_status[0]?.status === 'approved').length}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Reapplied</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {applications.filter(app => app.status === 'reapplied').length}
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
                  <RefreshCw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
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
            <div className="overflow-x-auto">
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
    </PageWrapper>
  );
}
