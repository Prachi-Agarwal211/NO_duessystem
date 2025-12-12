'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileCheck, Search, Upload } from 'lucide-react';
import PageWrapper from '@/components/landing/PageWrapper';
import ActionCard from '@/components/landing/ActionCard';
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

          {/* Refined Title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-2"
          >
            <span className="font-sans text-[10px] md:text-xs text-jecrc-red font-bold tracking-[0.5em] uppercase opacity-80">
              Student Services
            </span>
            <h1 className={`font-serif text-4xl md:text-5xl lg:text-6xl tracking-tight transition-colors duration-700 ease-smooth
              ${isDark
                ? 'text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/80'
                : 'text-ink-black'}`}
              style={isDark ? {
                textShadow: '0 0 40px rgba(255, 255, 255, 0.5), 0 0 80px rgba(196, 30, 58, 0.3), 0 4px 20px rgba(0, 0, 0, 0.8)',
                filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))'
              } : {}}>
              NO DUES
            </h1>

            {/* Decorative Line */}
            <div className="relative h-[1px] w-20 mt-4 overflow-hidden">
              <div className={`absolute inset-0 transition-colors duration-700 ease-smooth ${isDark ? 'bg-white/20' : 'bg-black/10'}`}></div>
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-jecrc-red to-transparent"
              />
            </div>
          </motion.div>
        </header>

        {/* Main Content Area - Enhanced Spacing & Visual Separation */}
        <main className="w-full max-w-7xl px-4 sm:px-6 md:px-12 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 md:gap-14 lg:gap-16 items-stretch">
            <ActionCard
              index={0}
              title="Submit No Dues Form"
              subtitle="Submit a new no-dues application for semester end or degree completion."
              icon={FileCheck}
              onClick={() => router.push('/student/submit-form')}
            />
            <ActionCard
              index={1}
              title="Check No Dues Form Status"
              subtitle="Track the status of your no dues application using your registration number."
              icon={Search}
              onClick={() => router.push('/student/check-status')}
            />
            <ActionCard
              index={2}
              title="Upload Manual Completed No Dues"
              subtitle="Already completed offline? Upload your manually completed no-dues form here."
              icon={Upload}
              onClick={() => router.push('/student/manual-entry')}
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
