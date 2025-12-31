'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import { Mail, CheckCircle, XCircle, Clock, RefreshCcw, ArrowLeft, AlertCircle, Send, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmailMonitoringPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalEmails: 0,
    sentCount: 0,
    failedCount: 0,
    pendingCount: 0,
    successRate: 0,
    typeBreakdown: {}
  });
  const [filters, setFilters] = useState({
    email_type: 'all',
    status: 'all'
  });
  const [retrying, setRetrying] = useState(null);

  const emailTypes = [
    { id: 'all', label: 'All Types' },
    { id: 'submission', label: 'Form Submission' },
    { id: 'approval', label: 'Approval' },
    { id: 'rejection', label: 'Rejection' },
    { id: 'completion', label: 'Completion' },
    { id: 'support_response', label: 'Support Response' },
    { id: 'department_reminder', label: 'Department Reminder' },
    { id: 'staff_welcome', label: 'Staff Welcome' }
  ];

  const statusOptions = [
    { id: 'all', label: 'All Status' },
    { id: 'sent', label: 'Sent' },
    { id: 'failed', label: 'Failed' },
    { id: 'pending', label: 'Pending' }
  ];

  const fetchEmailLogs = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/staff/login');
        return;
      }

      const params = new URLSearchParams({
        email_type: filters.email_type,
        status: filters.status,
        limit: '100'
      });

      const res = await fetch(`/api/admin/email-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      const json = await res.json();
      if (json.success) {
        setLogs(json.logs || []);
        setStats(json.stats || stats);
      } else {
        toast.error('Failed to load email logs');
      }
    } catch (e) {
      console.error('Fetch error:', e);
      toast.error('Error loading email logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailLogs();
  }, [filters]);

  const retryEmail = async (emailLogId) => {
    setRetrying(emailLogId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/email-logs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emailLogId })
      });

      const result = await res.json();
      if (result.success) {
        toast.success('Email resent successfully');
        fetchEmailLogs();
      } else {
        toast.error(result.error || 'Failed to resend email');
      }
    } catch (e) {
      console.error('Retry error:', e);
      toast.error('Error resending email');
    } finally {
      setRetrying(null);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'sent': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Mail className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'sent': return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
      case 'failed': return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30';
      default: return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Monitoring</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Track and monitor all system emails</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-white font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              onClick={fetchEmailLogs}
              className="p-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded-xl transition-all"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="flex items-center justify-between border-l-4 border-l-blue-500">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Total Emails</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalEmails}</h2>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </GlassCard>

          <GlassCard className="flex items-center justify-between border-l-4 border-l-green-500">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Sent</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.sentCount}</h2>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">{stats.successRate}% success rate</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </GlassCard>

          <GlassCard className="flex items-center justify-between border-l-4 border-l-red-500">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Failed</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.failedCount}</h2>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-xl">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </GlassCard>

          <GlassCard className="flex items-center justify-between border-l-4 border-l-yellow-500">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Pending</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.pendingCount}</h2>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </GlassCard>
        </div>

        {/* Email Type Breakdown */}
        {Object.keys(stats.typeBreakdown || {}).length > 0 && (
          <GlassCard className="mb-8 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Email Type Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(stats.typeBreakdown).map(([type, counts]) => (
                <div key={type} className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 capitalize">{type.replace('_', ' ')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts.total}</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="text-green-600 dark:text-green-400">✓ {counts.sent || 0}</span>
                    <span className="text-red-600 dark:text-red-400">✗ {counts.failed || 0}</span>
                    <span className="text-yellow-600 dark:text-yellow-400">⏳ {counts.pending || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Main Content */}
        <GlassCard>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
            <select
              value={filters.email_type}
              onChange={(e) => setFilters(prev => ({ ...prev, email_type: e.target.value }))}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {emailTypes.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {statusOptions.map(status => (
                <option key={status.id} value={status.id}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Email Logs List */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Email Logs Found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${getStatusColor(log.status)}`}>
                          {getStatusIcon(log.status)}
                          {log.status.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">
                          {log.email_type}
                        </span>
                        {log.retry_count > 0 && (
                          <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                            <RefreshCcw className="w-3 h-3" />
                            Retry {log.retry_count}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white mb-1">{log.subject}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{log.recipient_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{log.recipient_email}</span>
                      </div>
                      {log.error_message && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{log.error_message}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(log.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {log.status === 'failed' && (
                        <button
                          onClick={() => retryEmail(log.id)}
                          disabled={retrying === log.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {retrying === log.id ? (
                            <>
                              <RefreshCcw className="w-3 h-3 animate-spin" />
                              Retrying...
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              Retry
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </PageWrapper>
  );
}