'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Logo from '@/components/ui/Logo';

function StaffLoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      if (!email.trim() || !password.trim()) {
        throw new Error('Email and password are required');
      }

      // Attempt login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw authError;

      if (!authData.user || !authData.session) {
        throw new Error('Login failed. Please try again.');
      }

      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify user has staff role (department or admin)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, department_name')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        console.error('Auth data:', authData);
        throw new Error(`Failed to load user profile: ${profileError.message || profileError.code || 'Unknown error'}`);
      }

      if (!profile || (profile.role !== 'department' && profile.role !== 'admin')) {
        // Sign out the user since they're not authorized
        await supabase.auth.signOut();
        throw new Error('Access denied. Only department staff and administrators can log in here.');
      }

      // Success! Redirect based on role
      const redirect = searchParams.get('redirect') ||
        (profile.role === 'admin' ? '/admin' : '/staff/dashboard');
      router.push(redirect);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <GlassCard>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <Logo size="medium" />
              </div>
              <h1 className={`text-3xl sm:text-4xl font-bold mb-2 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                }`}>
                Staff Login
              </h1>
              <p className={`text-sm transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                Department Staff & Administrators Only
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-jecrc-red transition-all duration-300 ${isDark
                    ? 'bg-white/10 border border-white/20 text-white placeholder-gray-500'
                    : 'bg-white border border-black/20 text-ink-black placeholder-gray-400'
                    }`}
                  placeholder="your.email@jecrcu.edu.in"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-jecrc-red transition-all duration-300 ${isDark
                    ? 'bg-white/10 border border-white/20 text-white placeholder-gray-500'
                    : 'bg-white border border-black/20 text-ink-black placeholder-gray-400'
                    }`}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="interactive w-full px-6 py-3 min-h-[44px] bg-jecrc-red hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span>Logging in...</span>
                  </>
                ) : (
                  'Login to Dashboard'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => router.push('/')}
                className={`text-sm transition-colors duration-700 hover:underline ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                ← Back to Home
              </button>
            </div>

            <div className={`mt-6 pt-6 border-t text-center text-xs transition-colors duration-700 ${isDark ? 'border-white/10 text-gray-500' : 'border-black/10 text-gray-600'
              }`}>
              <p>Need help? Contact your system administrator</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function StaffLogin() {
  return (
    <Suspense fallback={
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageWrapper>
    }>
      <StaffLoginContent />
    </Suspense>
  );
}