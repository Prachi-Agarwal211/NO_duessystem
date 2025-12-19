'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import { Search, Users, Building2, RefreshCcw, ArrowLeft, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSupportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('student'); // 'student' or 'department'
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    student_total: 0,
    student_open: 0,
    department_total: 0,
    department_open: 0
  });
  const [search, setSearch] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const statusOptions = [
    { id: 'all', label: 'All Tickets' },
    { id: 'open', label: 'Open' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'closed', label: 'Closed' }
  ];

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/staff/login');
        return;
      }

      const params = new URLSearchParams({
        requester_type: activeTab,
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const res = await fetch(`/api/support?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      const json = await res.json();
      if (json.success) {
        setTickets(json.tickets || []);
        setStats(json.stats || stats);
      } else {
        toast.error('Failed to load tickets');
      }
    } catch (e) {
      console.error("Fetch error:", e);
      toast.error('Error loading tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [activeTab, statusFilter]);

  const updateTicketStatus = async (ticketId, newStatus) => {
    setUpdatingStatus(ticketId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/support', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ticketId, status: newStatus })
      });

      const result = await res.json();
      if (result.success) {
        toast.success('Status updated successfully');
        fetchTickets();
      } else {
        toast.error('Failed to update status');
      }
    } catch (e) {
      console.error("Update error:", e);
      toast.error('Error updating status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject?.toLowerCase().includes(search.toLowerCase()) ||
    ticket.message?.toLowerCase().includes(search.toLowerCase()) ||
    ticket.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
    ticket.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    ticket.user_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30';
      case 'in_progress': return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
      case 'resolved': return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
      case 'closed': return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30';
      default: return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'open': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <RefreshCcw className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'closed': return <XCircle className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage student and department support requests.</p>
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
              onClick={fetchTickets}
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
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Student Tickets</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.student_total}</h2>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
           </GlassCard>
           
           <GlassCard className="flex items-center justify-between border-l-4 border-l-yellow-500">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Student Open</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.student_open}</h2>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
           </GlassCard>

           <GlassCard className="flex items-center justify-between border-l-4 border-l-purple-500">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Department Tickets</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.department_total}</h2>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
           </GlassCard>

           <GlassCard className="flex items-center justify-between border-l-4 border-l-red-500">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Department Open</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.department_open}</h2>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-xl">
                <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
           </GlassCard>
        </div>

        {/* Main Content */}
        <GlassCard>
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab('student')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === 'student'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'
              }`}
            >
              <Users className="w-4 h-4" />
              Student Tickets
            </button>
            <button
              onClick={() => setActiveTab('department')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === 'department'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Department Tickets
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {statusOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Tickets List */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No Tickets Found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {search ? 'Try a different search term' : `No ${activeTab} tickets yet`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  className="p-5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all"
                >
                  {/* Ticket Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">
                        #{ticket.ticket_number}
                      </span>
                      <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Ticket Content */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {ticket.message}
                    </p>
                  </div>

                  {/* Ticket Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">{ticket.user_name}</span>
                      <span>•</span>
                      <span>{ticket.user_email}</span>
                    </div>
                    <select
                      value={ticket.status}
                      onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                      disabled={updatingStatus === ticket.id}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 cursor-pointer hover:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
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