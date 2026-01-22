'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileCheck, Search } from 'lucide-react';
import PageWrapper from '@/components/landing/PageWrapper';
import Logo from '@/components/ui/Logo';
import { useTheme } from '@/contexts/ThemeContext';

// Premium Action Card Component
function PremiumActionCard({ title, subtitle, icon: Icon, onClick, variant = 'primary', index }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isPrimary = variant === 'primary';

  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.15, ease: "easeOut" }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        w-full p-6 sm:p-8 rounded-2xl text-left transition-all duration-500
        ${isDark
          ? 'bg-gradient-to-br from-white/5 to-white/10 border border-white/10 hover:border-jecrc-red/30'
          : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-jecrc-red/50'
        }
        ${isPrimary
          ? 'shadow-xl hover:shadow-2xl'
          : 'shadow-lg hover:shadow-xl'
        }
        group relative overflow-hidden
      `}
    >
      {/* Premium Accent Line */}
      <div className={`
        absolute top-0 left-0 w-full h-1
        ${isPrimary
          ? 'bg-gradient-to-r from-jecrc-red via-jecrc-red-light to-jecrc-red'
          : 'bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400'
        }
        opacity-90 group-hover:opacity-100 transition-opacity duration-300
      `} />
      
      {/* Icon with Premium Glow */}
      <div className={`
        w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-4 sm:mb-6 flex items-center justify-center
        ${isPrimary
          ? 'bg-gradient-to-br from-jecrc-red to-jecrc-red-dark text-white shadow-lg shadow-jecrc-red/30'
          : isDark
            ? 'bg-white/10 text-white border border-white/20'
            : 'bg-gray-100 text-gray-700 border border-gray-200'
        }
        group-hover:scale-110 transition-transform duration-500
      `}>
        <Icon size={28} strokeWidth={2} />
      </div>
      
      {/* Title */}
      <h3 className={`
        text-xl sm:text-2xl font-bold mb-2 sm:mb-3
        ${isDark ? 'text-white' : 'text-gray-900'}
      `}>
        {title}
      </h3>
      
      {/* Subtitle */}
      <p className={`
        text-sm sm:text-base leading-relaxed mb-4 sm:mb-6
        ${isDark ? 'text-gray-400' : 'text-gray-600'}
      `}>
        {subtitle}
      </p>
      
      {/* CTA with Arrow Animation */}
      <div className={`
        inline-flex items-center gap-2 text-sm sm:text-base font-semibold
        ${isPrimary
          ? 'text-jecrc-red'
          : isDark
            ? 'text-gray-300'
            : 'text-gray-700'
        }
        group-hover:gap-3 transition-all duration-500
      `}>
        Proceed
        <motion.svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </motion.svg>
      </div>
    </motion.button>
  );
}

// Premium Process Steps Component
function PremiumProcessSteps() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const steps = [
    { label: 'Submit Application' },
    { label: 'Department Approvals' },
    { label: 'Get Certificate' }
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6 sm:mt-8">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.4 + i * 0.15 }}
          className={`
            px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium
            ${isDark
              ? 'bg-white/10 text-gray-300 border border-white/10 hover:bg-white/15'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }
            transition-all duration-300
          `}
        >
          {step.label}
          {i < steps.length - 1 && (
            <span className="mx-2 opacity-40">→</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// Premium Trust Signals Component
function PremiumTrustSignals() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const signals = [
    'Digitally Verified',
    'No Physical Visits',
    'Official Record'
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-6 sm:mt-8">
      {signals.map((signal, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 + i * 0.15 }}
          className={`
            flex items-center gap-2 text-xs sm:text-sm font-medium
            ${isDark ? 'text-gray-400' : 'text-gray-600'}
          `}
        >
          <span className="text-emerald-500 text-sm sm:text-base">✓</span>
          {signal}
        </motion.span>
      ))}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <PageWrapper>
      {/* Main Container - Premium Seamless Design */}
      <div className="min-h-screen w-full flex flex-col relative overflow-hidden">
        
        {/* Premium Background */}
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

        {/* Main Content */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 flex items-center">
          
          {/* Centered Content Container */}
          <div className="w-full max-w-3xl mx-auto">
            
            {/* Logo - Centered with Premium Spacing */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <Logo size="large" priority={true} className="opacity-95 hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Title Section - Centered Premium */}
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
                  text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight mb-2 sm:mb-3
                  ${isDark
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400'
                    : 'text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900'
                  }
                `}
              >
                NO DUES
              </motion.h1>
              
              {/* Premium Decorative Line */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 100 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className={`
                  h-1.5 mx-auto rounded-full
                  ${isDark ? 'bg-gradient-to-r from-jecrc-red to-jecrc-red-bright' : 'bg-gradient-to-r from-jecrc-red to-jecrc-red-dark'}
                `}
              />
            </div>

            {/* Process Steps */}
            <PremiumProcessSteps />

            {/* Action Cards - Premium Grid */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mt-8 sm:mt-10"
            >
              <PremiumActionCard
                index={0}
                title="Submit No Dues"
                subtitle="Apply for semester-end or degree completion clearance."
                icon={FileCheck}
                onClick={() => router.push('/student/submit-form')}
                variant="primary"
              />
              
              <PremiumActionCard
                index={1}
                title="Check Status"
                subtitle="Track your application status via registration number."
                icon={Search}
                onClick={() => router.push('/student/check-status')}
                variant="secondary"
              />
            </motion.div>

            {/* Trust Signals */}
            <PremiumTrustSignals />

          </div>
        </main>

        {/* Footer - Premium */}
        <footer className="w-full py-6 sm:py-8 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className={`
              text-xs sm:text-sm uppercase tracking-[0.15em] font-medium
              ${isDark ? 'text-white/40' : 'text-black/50'}
            `}
          >
            Jaipur Engineering College and Research Centre
          </motion.div>
        </footer>

      </div>
    </PageWrapper>
  );
}
