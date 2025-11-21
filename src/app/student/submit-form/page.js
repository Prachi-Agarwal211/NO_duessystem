'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/landing/PageWrapper';
import SubmitForm from '@/components/student/SubmitForm';
import Logo from '@/components/ui/Logo';
import { useTheme } from '@/contexts/ThemeContext';

export default function SubmitFormPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <PageWrapper>
      <div className="min-h-screen py-12 px-4 sm:px-6">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => router.push('/')}
          className={`interactive mb-8 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-700 ease-smooth backdrop-blur-md
            ${isDark
              ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
              : 'text-gray-600 hover:text-black bg-white hover:bg-gray-50 border border-black/10'
            }`}
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Home</span>
        </motion.button>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className={`p-8 md:p-12 rounded-xl backdrop-blur-md transition-all duration-700 ease-smooth
              ${isDark
                ? 'bg-white/[0.02] border border-white/10 shadow-2xl shadow-black/50'
                : 'bg-white border border-black/5 shadow-[0_15px_40px_rgba(0,0,0,0.04)]'
              }`}
          >
            {/* Header */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="mb-4">
                  <Logo size="medium" showText={true} />
                </div>
                <span className="inline-block text-xs font-bold text-jecrc-red tracking-[0.3em] uppercase mb-3">
                  Student Services
                </span>
                <h1 className={`font-serif text-4xl md:text-5xl mb-3 transition-colors duration-700 ease-smooth
                  ${isDark ? 'text-white' : 'text-ink-black'}`}>
                  Submit No Dues Form
                </h1>
                <p className={`text-sm font-medium transition-colors duration-700 ease-smooth
                  ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Fill in your details to apply for no dues clearance
                </p>
              </motion.div>

              {/* Decorative Line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="h-[1px] w-24 mx-auto mt-6 bg-gradient-to-r from-transparent via-jecrc-red to-transparent"
              />
            </div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <SubmitForm />
            </motion.div>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className={`mt-6 p-6 rounded-xl backdrop-blur-md transition-all duration-700 ease-smooth
              ${isDark
                ? 'bg-white/[0.02] border border-white/10'
                : 'bg-white border border-black/5 shadow-sm'
              }`}
          >
            <h3 className={`font-serif text-lg mb-3 transition-colors duration-700 ease-smooth
              ${isDark ? 'text-white' : 'text-ink-black'}`}>
              Important Information
            </h3>
            <ul className={`space-y-2 text-sm transition-colors duration-700 ease-smooth
              ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <li className="flex gap-2">
                <span className="text-jecrc-red">•</span>
                <span>You can only submit one form per registration number</span>
              </li>
              <li className="flex gap-2">
                <span className="text-jecrc-red">•</span>
                <span>All required fields must be filled accurately</span>
              </li>
              <li className="flex gap-2">
                <span className="text-jecrc-red">•</span>
                <span>Your form will be sent to all 12 departments for approval</span>
              </li>
              <li className="flex gap-2">
                <span className="text-jecrc-red">•</span>
                <span>You can track your form status anytime using your registration number</span>
              </li>
              <li className="flex gap-2">
                <span className="text-jecrc-red">•</span>
                <span>Certificate will be auto-generated once all departments approve</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}