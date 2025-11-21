'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';

export default function Unauthorized() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <PageWrapper>
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <GlassCard>
            <div className="text-center">
              {/* Error Icon */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-6"
              >
                <svg
                  className={`mx-auto h-20 w-20 transition-colors duration-700 ${
                    isDark ? 'text-red-400' : 'text-red-600'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </motion.div>

              {/* Error Message */}
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`text-3xl sm:text-4xl font-bold mb-4 transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}
              >
                Access Denied
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className={`text-lg mb-2 transition-colors duration-700 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                You don't have permission to access this page
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className={`text-sm mb-8 transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                This area is restricted to authorized staff members only.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <button
                  onClick={() => router.back()}
                  className={`interactive px-6 py-3 min-h-[44px] rounded-lg font-semibold transition-all duration-300 ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-ink-black'
                  }`}
                >
                  Go Back
                </button>
                
                <button
                  onClick={() => router.push('/')}
                  className="interactive px-6 py-3 min-h-[44px] bg-jecrc-red hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-300"
                >
                  Return to Home
                </button>
              </motion.div>

              {/* Help Text */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className={`mt-8 pt-8 border-t text-center transition-colors duration-700 ${
                  isDark ? 'border-white/10' : 'border-black/10'
                }`}
              >
                <p className={`text-sm mb-2 transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  If you believe you should have access to this page:
                </p>
                <ul className={`text-sm space-y-1 transition-colors duration-700 ${
                  isDark ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  <li>• Make sure you're logged in with the correct account</li>
                  <li>• Verify your account has the appropriate permissions</li>
                  <li>• Contact your system administrator for assistance</li>
                </ul>
              </motion.div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </PageWrapper>
  );
}