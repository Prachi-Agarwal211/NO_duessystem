'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import TicketList from '@/components/support/TicketList';
import { Search, Inbox, CheckCircle, Archive, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffSupportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('open');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total_tickets: 0,
    open_tickets: 0,
    in_progress_tickets: 0,
    resolved_tickets: 0,
    closed_tickets: 0
  });
  const [search, setSearch] = useState('');

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

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject?.toLowerCase().includes(search.toLowerCase()) ||
    ticket.message?.toLowerCase().includes(search.toLowerCase()) ||
    ticket.ticket_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Department Support</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your support tickets and queries.</p>
          </div>
          <button
            onClick={fetchTickets}
            className="p-2.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red transition-all"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <GlassCard className="p-6 flex items-center justify-between border-l-4 border-l-yellow-500">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Open</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.open_tickets}</h2>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 rounded-xl">
                <Inbox className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
           </GlassCard>
           
           <GlassCard className="p-6 flex items-center justify-between border-l-4 border-l-jecrc-red">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">In Progress</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.in_progress_tickets}</h2>
              </div>
              <div className="p-3 bg-jecrc-rose dark:bg-jecrc-red/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-jecrc-red dark:text-jecrc-red-bright" />
              </div>
           </GlassCard>

           <GlassCard className="p-6 flex items-center justify-between border-l-4 border-l-green-500">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Resolved</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.resolved_tickets}</h2>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
           </GlassCard>

           <GlassCard className="p-6 flex items-center justify-between border-l-4 border-l-purple-500">
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
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border-blue-600'
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
            <GlassCard className="p-4 min-h-[500px]">
               <div className="mb-4 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tickets by subject, message, or number..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
               </div>
               
               <TicketList 
                 loading={loading}
                 tickets={filteredTickets}
                 onSelect={(ticket) => {
                   toast.info(`Ticket #${ticket.ticket_number} details`);
                 }}
               />
            </GlassCard>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}