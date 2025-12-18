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
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <GlassCard className="p-6 flex items-center justify-between border-l-4 border-l-yellow-400">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Open</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.open_tickets}</h2>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl">
                <Inbox className="w-6 h-6 text-yellow-500" />
              </div>
           </GlassCard>
           
           <GlassCard className="p-6 flex items-center justify-between border-l-4 border-l-blue-400">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">In Progress</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.in_progress_tickets}</h2>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-blue-500" />
              </div>
           </GlassCard>

           <GlassCard className="p-6 flex items-center justify-between border-l-4 border-l-green-400">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Resolved</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.resolved_tickets}</h2>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
           </GlassCard>

           <GlassCard className="p-6 flex items-center justify-between border-l-4 border-l-purple-400">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total_tickets}</h2>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                <Archive className="w-6 h-6 text-purple-500" />
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'
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
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search tickets..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
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