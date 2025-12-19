'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import { Search, Inbox, CheckCircle, Archive, RefreshCcw, ArrowLeft, Plus, Loader2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffSupportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('open');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total_tickets: 0,
    open_tickets: 0,
    in_progress_tickets: 0,
    resolved_tickets: 0,
    closed_tickets: 0
  });
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    message: ''
  });

  const tabs = [
    { id: 'open', label: 'Open', icon: <Inbox className="w-4 h-4"/> },
    { id: 'in_progress', label: 'In Progress', icon: <CheckCircle className="w-4 h-4"/> },
    { id: 'resolved', label: 'Resolved', icon: <CheckCircle className="w-4 h-4"/> },
    { id: 'all', label: 'All History', icon: <Archive className="w-4 h-4"/> },
  ];

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/staff/login');
        return;
      }

      const statusParam = activeTab === 'all' ? '' : `?status=${activeTab}`;
      const res = await fetch(`/api/support/my-tickets${statusParam}`, {
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
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.message.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    if (formData.message.trim().length < 10) {
      toast.error('Message must be at least 10 characters');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          message: formData.message,
          requesterType: 'department' // Staff/Department requests
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit ticket');
      }

      toast.success('Support request submitted successfully!');
      setIsModalOpen(false);
      setFormData({ email: '', message: '' });
      fetchTickets(); // Refresh list

    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.message || 'Failed to submit support request');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject?.toLowerCase().includes(search.toLowerCase()) ||
    ticket.message?.toLowerCase().includes(search.toLowerCase()) ||
    ticket.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
    ticket.user_email?.toLowerCase().includes(search.toLowerCase())
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

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Department Support</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your support requests to admin.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/staff/dashboard')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-white font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl font-medium shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Request</span>
            </button>
            <button
              onClick={fetchTickets}
              className="p-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded-xl transition-all"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <GlassCard className="flex items-center justify-between border-l-4 border-l-yellow-500">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Open</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.open_tickets}</h2>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 rounded-xl">
                <Inbox className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
           </GlassCard>
           
           <GlassCard className="flex items-center justify-between border-l-4 border-l-jecrc-red">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">In Progress</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.in_progress_tickets}</h2>
              </div>
              <div className="p-3 bg-jecrc-rose dark:bg-jecrc-red/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-jecrc-red dark:text-jecrc-red-bright" />
              </div>
           </GlassCard>

           <GlassCard className="flex items-center justify-between border-l-4 border-l-green-500">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Resolved</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.resolved_tickets}</h2>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
           </GlassCard>

           <GlassCard className="flex items-center justify-between border-l-4 border-l-purple-500">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Total</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_tickets}</h2>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                <Archive className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
           </GlassCard>
        </div>

        {/* Main Interface */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Sidebar / Filters */}
          <div className="w-full lg:w-64 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                  activeTab === tab.id
                    ? 'bg-jecrc-red text-white shadow-lg shadow-jecrc-red/20 border-jecrc-red'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 border-gray-200 dark:border-white/10'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* List Area */}
          <div className="flex-1">
            <GlassCard className="min-h-[500px]">
               <div className="mb-4 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent text-gray-900 dark:text-white transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
               </div>
               
               {loading ? (
                 <div className="space-y-3">
                   {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />)}
                 </div>
               ) : filteredTickets.length === 0 ? (
                 <div className="text-center flex flex-col items-center justify-center py-12">
                   <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                     <MessageSquare className="w-10 h-10 text-gray-400" />
                   </div>
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                     No Tickets Found
                   </h3>
                   <p className="text-gray-500 dark:text-gray-400 mb-6">
                     {search ? 'Try a different search term' : 'Submit your first support request'}
                   </p>
                   <button
                     onClick={() => setIsModalOpen(true)}
                     className="px-6 py-3 bg-jecrc-red hover:bg-red-700 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-jecrc-red/20 transition-all"
                   >
                     <Plus className="w-5 h-5" /> New Request
                   </button>
                 </div>
               ) : (
                 <div className="space-y-3">
                   {filteredTickets.map(ticket => (
                     <div 
                       key={ticket.id} 
                       className="p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-jecrc-red/50 dark:hover:border-jecrc-red/50 transition-all"
                     >
                       <div className="flex items-start justify-between gap-4 mb-3">
                         <div className="flex items-center gap-2">
                           <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                             #{ticket.ticket_number}
                           </span>
                           <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(ticket.status)}`}>
                             {ticket.status.replace('_', ' ').toUpperCase()}
                           </span>
                         </div>
                         <span className="text-xs text-gray-400">
                           {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                             day: '2-digit',
                             month: 'short',
                             year: 'numeric'
                           })}
                         </span>
                       </div>
                       <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{ticket.message}</p>
                       <p className="text-xs text-gray-400">From: {ticket.user_email}</p>
                     </div>
                   ))}
                 </div>
               )}
            </GlassCard>
          </div>

        </div>

        {/* Submit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-gray-200 dark:border-white/10">
              <button 
                onClick={() => setIsModalOpen(false)} 
                disabled={submitting}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none disabled:opacity-50"
              >
                ×
              </button>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Submit Support Request</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Send a message to the admin team.
              </p>
              
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Email *
                  </label>
                  <input 
                    type="email"
                    required
                    disabled={submitting}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="your.email@example.com"
                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message * (minimum 10 characters)
                  </label>
                  <textarea 
                    required
                    disabled={submitting}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Describe your issue or question..."
                    rows="5"
                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red resize-none disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {formData.message.length} characters
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-jecrc-red hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-jecrc-red/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}