'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileCheck, Search } from 'lucide-react';
import PageWrapper from '@/components/landing/PageWrapper';
import HeroBackground from '@/components/landing/HeroBackground';
import Logo from '@/components/ui/Logo';
import LiquidTitle from '@/components/landing/LiquidTitle';
import EnhancedActionCard from '@/components/landing/EnhancedActionCard';
import ProcessPreview from '@/components/landing/ProcessPreview';
import TrustSignals from '@/components/landing/TrustSignals';
import { useTheme } from '@/contexts/ThemeContext';

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
          fixed inset-0 -z-10 transition-colors duration-700
          ${isDark
            ? 'bg-[radial-gradient(ellipse_at_top,rgba(196,30,58,0.12)_0%,rgba(5,5,5,0.98)_40%,rgba(5,5,5,1)_60%)]'
            : 'bg-gradient-to-b from-white via-gray-50/50 to-white'
          }
        `} />

        <HeroBackground />

        {/* Deep gradient layer for depth and royal feel */}
        <div className="hero-gradient" aria-hidden="true" />

        {/* Light Mode Premium Backdrop */}
        {!isDark && (
          <div className="fixed inset-0 -z-10 bg-gradient-to-b from-white/95 via-white/80 to-white/95" />
        )}

        {/* Main Content */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 flex items-center justify-center min-h-[85vh]">

          {/* Centered Content Container */}
          <div className="w-full max-w-3xl mx-auto flex flex-col items-center">

            {/* Logo - Centered with Premium Spacing */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex justify-center mb-8 sm:mb-10"
            >
              <Logo size="large" priority={true} className="opacity-95 hover:opacity-100 transition-opacity duration-300" />
            </motion.div>

            {/* Title Section - Using Premium LiquidTitle */}
            <div className="mb-10 sm:mb-12 w-full">
              <LiquidTitle />
            </div>

            {/* Process Steps - Using Premium ProcessPreview */}
            <div className="mb-10 w-full flex justify-center">
              <ProcessPreview mode="horizontal" />
            </div>

            {/* Action Cards - Premium Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 w-full mt-4 sm:mt-6">
              <EnhancedActionCard
                index={0}
                title="Submit No Dues"
                subtitle="Apply for semester-end or degree completion clearance."
                icon={FileCheck}
                onClick={() => router.push('/student/submit-form')}
              />

              <EnhancedActionCard
                index={1}
                title="Check Status"
                subtitle="Track your application status via registration number."
                icon={Search}
                onClick={() => router.push('/student/check-status')}
              />
            </div>

            {/* Trust Signals */}
            <div className="mt-10 sm:mt-12">
              <TrustSignals />
            </div>

          </div>
        </main>

        {/* Footer - Premium */}
        <footer className="w-full py-6 sm:py-8 text-center mt-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className={`
              text-xs sm:text-sm uppercase tracking-[0.15em] font-medium transition-colors duration-500
              ${isDark ? 'text-white/40 hover:text-white/60' : 'text-black/50 hover:text-black/70'}
            `}
          >
            Jaipur Engineering College and Research Centre
          </motion.div>
        </footer>

      </div>
    </PageWrapper>
  );
}
