'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import { MessageSquare, Plus, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentSupport() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('open');

  // Simplified form state - Only email and message
  const [formData, setFormData] = useState({
    email: '',
    message: ''
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Fetch tickets from API (if user is logged in, otherwise show empty)
      // For now, show empty state - will be populated when tickets exist
      setTickets([]);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

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
          requesterType: 'student'
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit ticket');
      }

      toast.success('Support request submitted successfully!');
      setIsModalOpen(false);
      setFormData({ email: '', message: '' });
      
      // Add the new ticket to the list
      if (result.ticket) {
        setTickets(prev => [{
          id: result.ticket.ticketNumber,
          ticket_number: result.ticket.ticketNumber,
          email: result.ticket.email,
          message: formData.message,
          status: result.ticket.status,
          created_at: result.ticket.createdAt,
          requester_type: 'student'
        }, ...prev]);
      }

    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.message || 'Failed to submit support request');
    } finally {
      setSubmitting(false);
    }
  };

  const openTickets = tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved');
  const closedTickets = tickets.filter(t => t.status === 'closed' || t.status === 'resolved');

  const getStatusIcon = (status) => {
    switch(status) {
      case 'resolved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'closed': return <XCircle className="w-5 h-5 text-gray-400" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-500" />;
      default: return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      case 'in_progress': return 'In Progress';
      default: return 'Open';
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
                <Plus className="w-5 h-5" /> New Request
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
                    Open Requests ({openTickets.length})
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
                    Closed Requests ({closedTickets.length})
                    {activeTab === 'closed' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-jecrc-red dark:bg-jecrc-red" />
                )}
            </button>
        </div>

        {/* Tickets List */}
        <GlassCard className="min-h-[400px]">
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
                        {activeTab === 'open' ? 'No Open Requests' : 'No Closed Requests'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {activeTab === 'open' 
                            ? "You haven't submitted any support requests yet." 
                            : "No resolved or closed requests to show."}
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 bg-jecrc-red hover:bg-red-700 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-jecrc-red/20 transition-all"
                    >
                        <Plus className="w-5 h-5" /> Submit First Request
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {(activeTab === 'open' ? openTickets : closedTickets).map(ticket => (
                        <div 
                            key={ticket.id} 
                            className="p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-jecrc-red/50 dark:hover:border-jecrc-red/50 transition-all"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        {getStatusIcon(ticket.status)}
                                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                            #{ticket.ticket_number}
                                        </span>
                                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400">
                                            {getStatusText(ticket.status)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{ticket.message}</p>
                                    <p className="text-xs text-gray-400">From: {ticket.email}</p>
                                </div>
                                <div className="text-right text-xs text-gray-400">
                                    {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </GlassCard>

        {/* Simplified Submit Modal - Only Email + Message */}
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
                        Our admin team will review and respond to your request.
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
                                placeholder="Describe your issue or question in detail..."
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