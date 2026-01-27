'use client';
import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import Link from 'next/link';
import { ArrowLeft, Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Already logged in, redirect to dashboard
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/staff/dashboard');
        }
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Check Profile Role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      toast.success('Welcome back!');

      if (profile?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/staff/dashboard');
      }
    } catch (err) {
      setError(err.message);
      toast.error('Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper showSupportButton={false}>
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative z-10">

        {/* Back Button */}
        <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-jecrc-red dark:hover:text-jecrc-red-bright transition-colors z-10 px-4 py-2 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-black/5 dark:border-white/5">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Home</span>
        </Link>

        <GlassCard className="w-full max-w-md p-8 md:p-10 shadow-2xl relative z-10 transition-all duration-500">
          <div className="text-center mb-8">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors duration-500
              ${isDark ? 'bg-jecrc-red/10' : 'bg-jecrc-rose'}`}>
              <Lock className="w-8 h-8 text-jecrc-red" />
            </div>
            <h1 className={`text-3xl font-bold transition-colors duration-500 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Staff Login
            </h1>
            <p className={`mt-2 transition-colors duration-500 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Access the No-Dues Verification Portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">

            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="staff@college.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 outline-none transition-all
                    ${isDark
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-jecrc-red'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-jecrc-red'
                    }
                    focus:ring-2 focus:ring-jecrc-red/20
                  `}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between mb-2">
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <Link href="/staff/forgot-password" className="text-sm text-jecrc-red hover:text-jecrc-red-dark font-medium transition-colors">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pl-11 pr-12 py-3 rounded-xl border-2 outline-none transition-all
                    ${isDark
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-jecrc-red'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-jecrc-red'
                    }
                    focus:ring-2 focus:ring-jecrc-red/20
                  `}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed
                bg-gradient-to-br from-jecrc-red to-jecrc-red-dark text-white hover:shadow-jecrc-red/25
              `}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </button>
          </form>
        </GlassCard>
      </div>
    </PageWrapper>
  );
}

export default function StaffLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-jecrc-red/30 border-t-jecrc-red rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
