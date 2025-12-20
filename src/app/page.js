'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileCheck, Search } from 'lucide-react';
import PageWrapper from '@/components/landing/PageWrapper';
import EnhancedActionCard from '@/components/landing/EnhancedActionCard';
import LiquidTitle from '@/components/landing/LiquidTitle';
import Logo from '@/components/ui/Logo';
import { useTheme } from '@/contexts/ThemeContext';

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  
  // Provide default theme during SSR/initial render
  const currentTheme = theme || 'dark';
  const isDark = currentTheme === 'dark';

  return (
    <PageWrapper>
      <div className="min-h-screen flex flex-col items-center justify-center px-4">

        {/* Centered Header / Branding */}
        <header className="flex flex-col items-center mb-12 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-6"
          >
            <Logo size="medium" priority={true} />
          </motion.div>

          {/* Enhanced Liquid Title */}
          <LiquidTitle />
        </header>

        {/* Main Content Area - Enhanced Spacing & Visual Separation */}
        <main className="w-full max-w-7xl px-4 sm:px-6 md:px-12 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 md:gap-12 lg:gap-16 items-stretch max-w-4xl mx-auto">
            <EnhancedActionCard
              index={0}
              title="Submit No Dues Form"
              subtitle="Submit a new no-dues application for semester end or degree completion."
              icon={FileCheck}
              onClick={() => router.push('/student/submit-form')}
            />
            <EnhancedActionCard
              index={1}
              title="Check No Dues Form Status"
              subtitle="Track the status of your no dues application using your registration number."
              icon={Search}
              onClick={() => router.push('/student/check-status')}
            />
          </div>
        </main>

        {/* Minimal Footer with enhanced visibility */}
        <footer className="mt-auto mb-8 flex flex-col items-center gap-5 opacity-70 hover:opacity-100 transition-opacity duration-500">
          <div
            className={`font-sans text-[9px] tracking-[0.3em] uppercase transition-colors duration-700 ease-smooth ${isDark ? 'text-gray-300' : 'text-gray-800'}`}
            style={isDark ? {
              textShadow: '0 0 20px rgba(255, 255, 255, 0.3), 0 2px 10px rgba(0, 0, 0, 0.8)'
            } : {
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
            }}>
            Jaipur Engineering College and Research Centre
          </div>
        </footer>
      </div>
    </PageWrapper>
  );
}
