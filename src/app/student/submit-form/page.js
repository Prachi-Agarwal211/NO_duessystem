'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/landing/PageWrapper';
import SubmitForm from '@/components/student/SubmitForm';
import Logo from '@/components/ui/Logo';
import { useTheme } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function SubmitFormPageContent() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      {/* Premium Background - Same as Landing Page */}
      <div className={`
        fixed inset-0 -z-10
        ${isDark
          ? 'bg-[radial-gradient(ellipse_at_top,rgba(196,30,58,0.12)_0%,rgba(5,5,5,0.98)_40%,rgba(5,5,5,1)_60%)]'
          : 'bg-gradient-to-b from-white via-gray-50/50 to-white'
        }
      `} />
      
      {/* Light Mode Premium Backdrop */}
      {!isDark && (
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-white/95 via-white/80 to-white/95" />
      )}

      <div className="relative z-10 min-h-screen w-full flex flex-col items-center py-8 sm:py-12 px-4 sm:px-6">
        {/* Back Button - Premium Style */}
        <div className="w-full max-w-5xl mb-6 sm:mb-8">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => router.push('/')}
            className={`
              interactive flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
              ${isDark
                ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
                : 'text-gray-600 hover:text-black bg-white hover:bg-gray-50 border border-black/10'
              }
            `}
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="font-medium text-sm">Back to Home</span>
          </motion.button>
        </div>

        {/* Main Content Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-5xl"
        >
          {/* Header Section - Premium Centered */}
          <div className="text-center mb-8 sm:mb-10">
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`
                inline-block text-xs sm:text-sm font-bold uppercase tracking-[0.2em] mb-3 sm:mb-4
                ${isDark ? 'text-jecrc-red-bright' : 'text-jecrc-red-dark'}
              `}
            >
              Student Services
            </motion.span>
            
            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className={`
                text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-2 sm:mb-3
                ${isDark
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900'
                }
              `}
            >
              Submit Application
            </motion.h1>
            
            {/* Premium Decorative Line */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 80 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className={`
                h-1.5 mx-auto rounded-full
                ${isDark ? 'bg-gradient-to-r from-jecrc-red to-jecrc-red-bright' : 'bg-gradient-to-r from-jecrc-red to-jecrc-red-dark'}
              `}
            />
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={`
                text-sm sm:text-base mt-3 max-w-md mx-auto
                ${isDark ? 'text-gray-400' : 'text-gray-600'}
              `}
            >
              Fill in your details to initiate the no-dues clearance process.
            </motion.p>
          </div>

          {/* Form Surface - Premium Card Style */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className={`
              rounded-2xl overflow-hidden transition-all duration-500
              ${isDark
                ? 'bg-gradient-to-br from-white/5 to-white/10 border border-white/10'
                : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
              }
              shadow-xl
            `}
          >
            <SubmitForm />
          </motion.div>

          {/* Info Card - Premium Style */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className={`
              mt-6 sm:mt-8 text-center text-sm p-4 rounded-xl
              ${isDark
                ? 'bg-white/5 border border-white/10 text-gray-400'
                : 'bg-gray-50 border border-gray-200 text-gray-600'
              }
            `}
          >
            <p>Need help? Contact the administrative office.</p>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}

export default function SubmitFormPage() {
  return (
    <ErrorBoundary>
      <PageWrapper>
        <SubmitFormPageContent />
      </PageWrapper>
    </ErrorBoundary>
  );
}