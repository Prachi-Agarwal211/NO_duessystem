'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import PageWrapper from '@/components/landing/PageWrapper';
import GlobalBackground from '@/components/ui/GlobalBackground';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function DepartmentActionContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [formId, setFormId] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const actionParam = searchParams.get('action');
    const formIdParam = searchParams.get('formId');

    if (!token || !actionParam || !formIdParam) {
      setError('Invalid or missing parameters');
      setLoading(false);
      return;
    }

    if (actionParam !== 'approve' && actionParam !== 'reject') {
      setError('Invalid action');
      setLoading(false);
      return;
    }

    setAction(actionParam);
    setFormId(formIdParam);

    // In a real implementation, you would validate the token here
    // For this example, we'll proceed with the action directly
    handleAction(token, actionParam, formIdParam);
  }, [searchParams]);

  const handleAction = async (token, action, formId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If not logged in, redirect to login with return URL
        router.push(`/staff/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, department_name')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'department') {  // FIXED: Changed from 'staff' to 'department'
        setError('Unauthorized: Only department staff can perform this action');
        setLoading(false);
        return;
      }

      // Get the form to verify it exists and get department info
      const { data: formData, error: formError } = await supabase
        .from('no_dues_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError || !formData) {
        setError('Form not found');
        setLoading(false);
        return;
      }

      // Verify that the user's department matches the action required
      // In a real implementation, you would check if this is the department that needs to act
      // For now, we'll assume the user can act if they're in the right department

      // Update the status
      const { error: statusError } = await supabase
        .from('no_dues_status')
        .upsert({
          form_id: formId,
          department_name: profile.department_name,
          status: action === 'approve' ? 'approved' : 'rejected',
          action_by_user_id: session.user.id,
          action_at: new Date().toISOString()
        });

      if (statusError) throw statusError;

      // Update the main form status if needed
      let newFormStatus = formData.status;
      if (formData.status === 'pending' && action === 'approve') {
        newFormStatus = 'in_progress';
      } else if (action === 'reject') {
        newFormStatus = 'rejected';
      }

      await supabase
        .from('no_dues_forms')
        .update({ status: newFormStatus })
        .eq('id', formId);

      setStatus('success');
      setMessage(action === 'approve'
        ? 'Request approved successfully'
        : 'Request rejected successfully');
    } catch (err) {
      console.error('Action error:', err);
      setError(`Error processing action: ${err.message}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <GlobalBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.6, type: "spring" }}
                  className="w-20 h-20 rounded-full bg-gradient-to-tr from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className={`text-xl font-bold mb-2 font-futuristic-heading transition-all duration-700
                  ${isDark
                    ? 'bg-gradient-to-r from-white via-green-200 to-green-400 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent'
                  }`}>
                  Action Completed
                </h2>
                <p className={`mb-6 transition-colors duration-700 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {message}
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/staff/dashboard')}
                  className="px-6 py-3 rounded-xl font-futuristic-accent text-lg
                           bg-gradient-to-r from-green-500 to-emerald-500
                           hover:from-green-500/80 hover:to-emerald-500/80
                           text-white border-2 border-green-500/50
                           transition-all duration-300 transform"
                >
                  Go to Dashboard
                </motion.button>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.6, type: "spring" }}
                  className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-400 to-rose-500 flex items-center justify-center mx-auto mb-4"
                >
                  <XCircle className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className={`text-xl font-bold mb-2 font-futuristic-heading transition-all duration-700
                  ${isDark
                    ? 'bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-red-700 to-red-500 bg-clip-text text-transparent'
                  }`}>
                  Error
                </h2>
                <p className={`mb-6 transition-colors duration-700 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {error}
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.back()}
                  className="px-6 py-3 rounded-xl font-futuristic-accent text-lg
                           bg-gradient-to-r from-red-500 to-rose-500
                           hover:from-red-500/80 hover:to-rose-500/80
                           text-white border-2 border-red-500/50
                           transition-all duration-300 transform"
                >
                  Go Back
                </motion.button>
              </div>
            </motion.div>
          ) : null}
        </GlassCard>
      </div>
    </PageWrapper>
  );
}

export default function DepartmentActionPage() {
  return (
    <Suspense fallback={
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageWrapper>
    }>
      <DepartmentActionContent />
    </Suspense>
  );
}
