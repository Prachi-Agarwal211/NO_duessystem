'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  User, 
  Mail, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Building2,
  Ticket
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import GlassCard from '@/components/ui/GlassCard';

export default function MyTicketsView({ userType = 'student' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchMyTickets();
  }, [statusFilter, currentPage]);

  const fetchMyTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/support/my-tickets?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTickets(data.tickets);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error('Failed to load your support tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load your support tickets');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
      closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };

    const icons = {
      open: AlertCircle,
      in_progress: Clock,
      resolved: CheckCircle2,
      closed: XCircle
    };

    const Icon = icons[status] || AlertCircle;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        <Icon className="w-3.5 h-3.5" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-gray-500/20 text-gray-400',
      normal: 'bg-blue-500/20 text-blue-400',
      high: 'bg-orange-500/20 text-orange-400',
      urgent: 'bg-red-500/20 text-red-400 animate-pulse'
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const DetailModal = () => {
    if (!selectedTicket) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl
            ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'}`}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Ticket Details
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedTicket.ticket_number}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Info */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Status</p>
                  <div>{getStatusBadge(selectedTicket.status)}</div>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Priority</p>
                  <div>{getPriorityBadge(selectedTicket.priority)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Created</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Last Updated</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedTicket.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedTicket.email}
                </p>
              </div>

              {selectedTicket.roll_number && (
                <div>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Roll Number</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTicket.roll_number}
                  </p>
                </div>
              )}

              {selectedTicket.subject && (
                <div>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Subject</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTicket.subject}
                  </p>
                </div>
              )}

              <div>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Message</p>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className={`whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {selectedTicket.message}
                  </p>
                </div>
              </div>

              {selectedTicket.admin_notes && (
                <div>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Admin Notes</p>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                    <p className={`whitespace-pre-wrap ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      {selectedTicket.admin_notes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowDetailModal(false)}
              className={`w-full px-4 py-2 rounded-lg font-medium
                ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Loading your support tickets..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            My Support Tickets
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            View and track your support requests
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.total_tickets}
                </p>
              </div>
              <Ticket className="w-8 h-8 text-purple-500" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Open</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.open_tickets}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-500" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>In Progress</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.in_progress_tickets}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Resolved</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.resolved_tickets}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Closed</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.closed_tickets}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-gray-500" />
            </div>
          </GlassCard>
        </div>
      )}

      {/* Filter */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg border outline-none
              ${isDark ? 'bg-white/5 border-white/10 text-white [&>option]:bg-[#0f0f0f] [&>option]:text-white [&>option:hover]:bg-[#1a1a1a]' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </GlassCard>

      {/* Tickets List */}
      <GlassCard className="overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              No Support Tickets
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              You haven't submitted any support requests yet.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Ticket #
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Subject
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Status
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Priority
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Created
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}
                    >
                      <td className={`px-4 py-3 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {ticket.ticket_number}
                      </td>
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} max-w-xs truncate`}>
                        {ticket.subject || 'No subject'}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(ticket.status)}
                      </td>
                      <td className="px-4 py-3">
                        {getPriorityBadge(ticket.priority)}
                      </td>
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowDetailModal(true);
                          }}
                          className={`p-2 rounded-lg transition-colors
                            ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </GlassCard>

      {/* Detail Modal */}
      {showDetailModal && <DetailModal />}
    </div>
  );
}