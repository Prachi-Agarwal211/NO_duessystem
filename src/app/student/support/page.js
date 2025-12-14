'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MyTicketsView from '@/components/support/MyTicketsView';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function StudentSupportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/student/login');
        return;
      }

      // Check if user is a student
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!profile || profile.role !== 'student') {
        router.push('/');
        return;
      }

      setUser(session.user);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/student/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-black dark:to-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <MyTicketsView userType="student" />
        </div>
      </div>
    </ErrorBoundary>
  );
}