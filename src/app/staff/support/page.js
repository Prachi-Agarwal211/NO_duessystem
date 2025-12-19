'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import { MessageSquare, ArrowLeft, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffSupportPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    message: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/staff/login');
      }
    };
    checkAuth();
  }, [router]);

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
          requesterType: 'department'
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit ticket');
      }

      toast.success('Support request submitted! Our admin team will respond soon.');
      setFormData({ email: '', message: '' });

    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.message || 'Failed to submit support request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Back Button */}
          <button
            onClick={() => router.push('/staff/dashboard')}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-white font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <GlassCard className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-jecrc-red/10 dark:bg-jecrc-red/20 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-jecrc-red dark:text-jecrc-red-bright" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Department Support</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Submit your issue or request to the admin team.
              </p>
            </div>

            {/* Support Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Your Email *
                </label>
                <input 
                  type="email"
                  required
                  disabled={submitting}
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="department.email@college.edu"
                  className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent disabled:opacity-50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Your Message * (minimum 10 characters)
                </label>
                <textarea 
                  required
                  disabled={submitting}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="Describe your issue, request, or question..."
                  rows="6"
                  className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent resize-none disabled:opacity-50 transition-all"
                />
                <p className="text-xs text-gray-400 mt-2">
                  {formData.message.length} / 10 characters minimum
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-jecrc-red/30 dark:shadow-neon-red transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Support Request
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm text-blue-800 dark:text-blue-300 text-center">
                💡 <strong>Tip:</strong> Admin team monitors all department requests in realtime and will assist you promptly.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </PageWrapper>
  );
}