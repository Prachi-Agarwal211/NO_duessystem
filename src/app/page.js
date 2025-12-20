'use client';

import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FileCheck, Search, ChevronDown } from 'lucide-react';
import PageWrapper from '@/components/landing/PageWrapper';
import EnhancedActionCard from '@/components/landing/EnhancedActionCard';
import LiquidTitle from '@/components/landing/LiquidTitle';
import Logo from '@/components/ui/Logo';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import { useTheme } from '@/contexts/ThemeContext';

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  const { scrollYProgress } = useScroll();
  
  // Provide default theme during SSR/initial render
  const currentTheme = theme || 'dark';
  const isDark = currentTheme === 'dark';

  // Parallax effects
  const yLogo = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const opacityHeader = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  return (
    <PageWrapper>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">

        {/* Centered Header / Branding with Parallax */}
        <motion.header
          style={{ y: yLogo, opacity: opacityHeader }}
          className="flex flex-col items-center mb-12 text-center px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6"
          >
            <Logo size="medium" priority={true} />
          </motion.div>

          {/* Enhanced Liquid Title */}
          <LiquidTitle />

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 1,
              repeat: Infinity,
              repeatType: "reverse",
              repeatDelay: 0.5
            }}
            className="mt-8"
          >
            <ChevronDown
              className={`w-6 h-6 ${isDark ? 'text-jecrc-red' : 'text-jecrc-red-dark'}`}
              style={{
                filter: isDark ? 'drop-shadow(0 0 8px rgba(196, 30, 58, 0.6))' : 'none'
              }}
            />
          </motion.div>
        </motion.header>

        {/* Main Content Area with Stagger Animation */}
        <main className="w-full max-w-7xl px-4 sm:px-6 md:px-12 pb-16">
          <StaggerContainer
            staggerDelay={0.15}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 md:gap-12 lg:gap-16 items-stretch max-w-4xl mx-auto"
          >
            <StaggerItem>
              <EnhancedActionCard
                index={0}
                title="Submit No Dues Form"
                subtitle="Submit a new no-dues application for semester end or degree completion."
                icon={FileCheck}
                onClick={() => router.push('/student/submit-form')}
              />
            </StaggerItem>
            <StaggerItem>
              <EnhancedActionCard
                index={1}
                title="Check No Dues Form Status"
                subtitle="Track the status of your no dues application using your registration number."
                icon={Search}
                onClick={() => router.push('/student/check-status')}
              />
            </StaggerItem>
          </StaggerContainer>
        </main>

        {/* Minimal Footer with Fade-in Animation */}
        <ScrollReveal animation="fade" delay={0.3}>
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
        </ScrollReveal>
      </div>
    </PageWrapper>
  );
}
