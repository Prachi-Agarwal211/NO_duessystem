'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import { MessageSquare, Plus, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentSupport() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('open'); // 'open' or 'closed'

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    priority: 'normal',
    message: ''
  });

  useEffect(() => {
    // TODO: Fetch tickets from API when implemented
    // For now, show empty state
    setLoading(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.category || !formData.message) {
      toast.error('Please fill all required fields');
      return;
    }

    // TODO: Implement API call to create ticket
    toast.success('Ticket submitted successfully!');
    setIsModalOpen(false);
    setFormData({ subject: '', category: '', priority: 'normal', message: '' });
  };

  const openTickets = tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved');
  const closedTickets = tickets.filter(t => t.status === 'closed' || t.status === 'resolved');

  const getStatusIcon = (status) => {
    switch(status) {
      case 'resolved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'closed': return <XCircle className="w-5 h-5 text-gray-400" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-white font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Home</span>
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Center</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Get help with your No-Dues application</p>
            </div>
            <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-jecrc-red hover:bg-red-700 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-jecrc-red/20 transition-all"
            >
                <Plus className="w-5 h-5" /> New Ticket
            </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-white/10">
            <button 
                onClick={() => setActiveTab('open')}
                className={`pb-3 px-1 font-medium transition-colors relative ${
                    activeTab === 'open' 
                        ? 'text-jecrc-red dark:text-jecrc-red'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    Open Tickets ({openTickets.length})
                    {activeTab === 'open' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-jecrc-red dark:bg-jecrc-red" />
                )}
            </button>
            <button 
                onClick={() => setActiveTab('closed')}
                className={`pb-3 px-1 font-medium transition-colors relative ${
                    activeTab === 'closed' 
                        ? 'text-jecrc-red dark:text-jecrc-red'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    Closed Tickets ({closedTickets.length})
                    {activeTab === 'closed' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-jecrc-red dark:bg-jecrc-red" />
                )}
            </button>
        </div>

        {/* Tickets List */}
        <GlassCard className="p-8 min-h-[400px]">
            {loading ? (
                <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />)}
                </div>
            ) : (activeTab === 'open' ? openTickets : closedTickets).length === 0 ? (
                <div className="text-center flex flex-col items-center justify-center py-12">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <MessageSquare className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {activeTab === 'open' ? 'No Open Tickets' : 'No Closed Tickets'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {activeTab === 'open' 
                            ? "You haven't raised any support requests yet." 
                            : "No resolved or closed tickets to show."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {(activeTab === 'open' ? openTickets : closedTickets).map(ticket => (
                        <div 
                            key={ticket.id} 
                            className="p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-jecrc-red/50 dark:hover:border-jecrc-red/50 transition-all cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getStatusIcon(ticket.status)}
                                        <h4 className="font-semibold text-gray-900 dark:text-white">{ticket.subject}</h4>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{ticket.category}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{ticket.message}</p>
                                </div>
                                <div className="text-right text-xs text-gray-400">
                                    {new Date(ticket.created_at).toLocaleDateString('en-IN')}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </GlassCard>

        {/* Create Ticket Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-gray-200 dark:border-white/10">
                    <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
                    >
                        ×
                    </button>
                    
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Submit Support Request</h2>
                    
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Subject *
                            </label>
                            <input 
                                type="text"
                                required
                                value={formData.subject}
                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                placeholder="Brief description of your issue"
                                className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Category *
                            </label>
                            <select 
                                required
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red"
                            >
                                <option value="">Select department</option>
                                <option value="library">Library</option>
                                <option value="accounts">Accounts</option>
                                <option value="hostel">Hostel</option>
                                <option value="sports">Sports</option>
                                <option value="academic">Academic</option>
                                <option value="technical">Technical Issue</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Priority
                            </label>
                            <select 
                                value={formData.priority}
                                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red"
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Message *
                            </label>
                            <textarea 
                                required
                                value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                                placeholder="Describe your issue in detail..."
                                rows="4"
                                className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red resize-none"
                            />
                        </div>

                        <button 
                            type="submit"
                            className="w-full py-3 bg-jecrc-red hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-jecrc-red/20 transition-all"
                        >
                            Submit Ticket
                        </button>
                    </form>
                </div>
            </div>
        )}
      </div>
    </PageWrapper>
  );
}