'use client';
import { useState } from 'react';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import TicketList from '@/components/support/TicketList';
import { Search, Inbox, CheckCircle, Archive } from 'lucide-react';

export default function StaffSupportPage() {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'resolved' | 'all'
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]); // Will load assigned tickets

  const tabs = [
    { id: 'inbox', label: 'Pending', icon: <Inbox className="w-4 h-4"/> },
    { id: 'resolved', label: 'Resolved', icon: <CheckCircle className="w-4 h-4"/> },
    { id: 'all', label: 'All History', icon: <Archive className="w-4 h-4"/> },
  ];

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Department Support</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage student queries assigned to your department.</p>
        </div>

        {/* Search & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <GlassCard className="p-6 flex items-center justify-between border-l-4 border-l-yellow-400">
              <div>
                <p className="text-gray-500 text-sm font-medium">Pending</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">12</h2>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl">
                <Inbox className="w-6 h-6 text-yellow-500" />
              </div>
           </GlassCard>
           
           <GlassCard className="p-6 flex items-center justify-between border-l-4 border-l-green-400">
              <div>
                <p className="text-gray-500 text-sm font-medium">Resolved Today</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">5</h2>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
           </GlassCard>

           <GlassCard className="p-6 flex items-center justify-between border-l-4 border-l-blue-400">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Tickets</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">48</h2>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                <Archive className="w-6 h-6 text-blue-500" />
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
                    placeholder="Search student or ticket..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
               </div>
               
               <TicketList 
                 loading={loading}
                 tickets={tickets} // Logic to filter based on activeTab goes here
                 onSelect={(t) => console.log("Resolve", t)}
               />
            </GlassCard>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}