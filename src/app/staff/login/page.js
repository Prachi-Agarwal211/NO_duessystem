'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlobalBackground from '@/components/ui/GlobalBackground';
import GlassCard from '@/components/ui/GlassCard';
import Link from 'next/link';
import { ArrowLeft, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

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

      if (profile?.role === 'admin') router.push('/admin');
      else router.push('/staff/dashboard');

      toast.success('Welcome back!');
    } catch (err) {
      setError(err.message);
      toast.error('Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <GlobalBackground />
      <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-4">
        
        {/* Back Button */}
        <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-10">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Home</span>
        </Link>

        <GlassCard className="w-full max-w-md p-8 md:p-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-jecrc-rose dark:bg-jecrc-red/20 rounded-full flex items-center justify-center mb-4">
               <Lock className="w-8 h-8 text-jecrc-red dark:text-jecrc-red-bright" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Login</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Access the No-Dues Verification Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                 <AlertCircle className="w-5 h-5 shrink-0" />
                 {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-jecrc-red/40 focus:border-jecrc-red outline-none transition-all"
                  placeholder="staff@college.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
                  <Link href="/staff/forgot-password" className="text-sm text-jecrc-red hover:text-jecrc-red-dark font-medium">Forgot?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-jecrc-red/40 focus:border-jecrc-red outline-none transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white font-bold rounded-xl shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
      <PageWrapper>
        <GlobalBackground />
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </PageWrapper>
    }>
      <LoginForm />
    </Suspense>
  );
}