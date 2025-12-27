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
      {/* Enterprise Backdrop */}
      {!isDark && <div className="light-backdrop" />}

      <div className="relative z-10 min-h-screen py-12 px-4 sm:px-6 flex flex-col items-center">
        {/* Back Button */}
        <div className="w-full max-w-3xl mb-8">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => router.push('/')}
            className={`group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                    ${isDark
                ? 'text-gray-400 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
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
          className="w-full max-w-3xl"
        >
          {/* Header Section (Locked Center) */}
          <div className="title-wrap mb-10">
            <Logo size="medium" />
            <div className="h-4"></div>
            <span className="text-xs font-bold text-jecrc-red tracking-[0.2em] uppercase mb-2">
              Student Services
            </span>
            <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Submit Application
            </h1>
            <div className="title-divider"></div>
            <p className={`text-sm mt-3 max-w-md ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Fill in your details to initiate the no-dues clearance process.
            </p>
          </div>

          {/* Form Surface */}
          <div className={`
                    rounded-[28px] overflow-hidden transition-all duration-300
                    ${isDark ? 'hero-info-panel-dark' : 'hero-info-panel-light'}
                `}>
            <SubmitForm />
          </div>

          {/* Info Card (Subtle) */}
          <div className={`mt-8 text-center text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            <p>Need help? Contact the administrative office.</p>
          </div>
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