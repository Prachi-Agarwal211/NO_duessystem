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
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Building2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import GlassCard from '@/components/ui/GlassCard';

export default function SupportTicketsTable() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [requesterTypeFilter, setRequesterTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, requesterTypeFilter, priorityFilter, searchTerm, currentPage]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (statusFilter) params.append('status', statusFilter);
      if (requesterTypeFilter) params.append('requester_type', requesterTypeFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/support?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTickets(data.tickets);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error('Failed to load support tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus, priority, adminNotes) => {
    setUpdating(true);
    try {
      const response = await fetch('/api/support', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          status: newStatus,
          priority,
          adminNotes
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Ticket updated successfully');
        fetchTickets();
        setShowDetailModal(false);
      } else {
        toast.error(data.error || 'Failed to update ticket');
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    } finally {
      setUpdating(false);
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

    const [editStatus, setEditStatus] = useState(selectedTicket.status);
    const [editPriority, setEditPriority] = useState(selectedTicket.priority);
    const [editNotes, setEditNotes] = useState(selectedTicket.admin_notes || '');

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
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Requester Type</p>
                  <div className="flex items-center gap-2">
                    {selectedTicket.requester_type === 'student' ? (
                      <User className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Building2 className="w-4 h-4 text-purple-500" />
                    )}
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {selectedTicket.requester_type === 'student' ? 'Student' : 'Department Staff'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Created</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedTicket.created_at).toLocaleString()}
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
            </div>

            {/* Edit Section */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border outline-none
                      ${isDark 
                        ? 'bg-white/5 border-white/10 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border outline-none
                      ${isDark 
                        ? 'bg-white/5 border-white/10 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Admin Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  placeholder="Add internal notes about this ticket..."
                  className={`w-full px-3 py-2 rounded-lg border outline-none resize-none
                    ${isDark 
                      ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => updateTicketStatus(selectedTicket.id, editStatus, editPriority, editNotes)}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-jecrc-red hover:bg-jecrc-red-dark text-white font-medium rounded-lg
                  transition-all disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Ticket'}
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className={`px-4 py-2 rounded-lg font-medium
                  ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Loading support tickets..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Open Tickets</p>
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
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.total_tickets}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-500" />
            </div>
          </GlassCard>
        </div>
      )}

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search tickets..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border outline-none
                  ${isDark 
                    ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg border outline-none
              ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={requesterTypeFilter}
            onChange={(e) => {
              setRequesterTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg border outline-none
              ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="">All Types</option>
            <option value="student">Students</option>
            <option value="department">Department</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg border outline-none
              ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </GlassCard>

      {/* Tickets Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Ticket #
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Type
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Contact
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {ticket.requester_type === 'student' ? (
                        <>
                          <User className="w-4 h-4 text-blue-500" />
                          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Student</span>
                        </>
                      ) : (
                        <>
                          <Building2 className="w-4 h-4 text-purple-500" />
                          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Department</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{ticket.email}</p>
                      {ticket.roll_number && (
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {ticket.roll_number}
                        </p>
                      )}
                    </div>
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
      </GlassCard>

      {/* Detail Modal */}
      {showDetailModal && <DetailModal />}
    </div>
  );
}