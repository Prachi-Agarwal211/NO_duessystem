'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import PageWrapper from '@/components/landing/PageWrapper';
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
  }, [searchParams, router]);

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
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          {status === 'success' ? (
            <div>
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <h2 className={`text-xl font-bold mb-2 transition-colors duration-700 ${
                isDark ? 'text-white' : 'text-ink-black'
              }`}>
                Action Completed
              </h2>
              <p className={`mb-6 transition-colors duration-700 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {message}
              </p>
              <button
                onClick={() => router.push('/staff/dashboard')}
                className="px-4 py-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300"
              >
                Go to Dashboard
              </button>
            </div>
          ) : error ? (
            <div>
              <div className="text-red-500 text-5xl mb-4">✗</div>
              <h2 className={`text-xl font-bold mb-2 transition-colors duration-700 ${
                isDark ? 'text-white' : 'text-ink-black'
              }`}>
                Error
              </h2>
              <p className={`mb-6 transition-colors duration-700 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {error}
              </p>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300"
              >
                Go Back
              </button>
            </div>
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
