'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BackgroundGradientAnimation from '@/components/ui/background-gradient-animation';
import GlassCard from '@/components/ui/GlassCard';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // In a real implementation, you would validate the token with an API call
    // For now, we'll assume it's valid
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid or missing reset token');
      setTokenValid(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // In a real implementation, you would send the new password and token via an API call
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setMessage('Your password has been reset successfully. You can now login with your new password.');
    } catch (error) {
      setError(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <BackgroundGradientAnimation>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard className="w-full max-w-md p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Invalid Token</h1>
            <p className="text-gray-300 mb-6">The password reset link is invalid or has expired.</p>
            <a 
              href="/forgot-password" 
              className="inline-block px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Request New Link
            </a>
          </GlassCard>
        </div>
      </BackgroundGradientAnimation>
    );
  }

  return (
    <BackgroundGradientAnimation>
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Reset Password</h1>
          
          {message ? (
            <div className="mb-6 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200">
              {message}
              <div className="mt-4">
                <a 
                  href="/login" 
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Login
                </a>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    placeholder="Enter new password"
                  />
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    placeholder="Confirm new password"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </GlassCard>
      </div>
    </BackgroundGradientAnimation>
  );
}
