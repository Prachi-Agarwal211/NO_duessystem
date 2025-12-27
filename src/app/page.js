'use client';

import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FileCheck, Search, ChevronDown } from 'lucide-react';
import PageWrapper from '@/components/landing/PageWrapper';
import EnhancedActionCard from '@/components/landing/EnhancedActionCard';
import LiquidTitle from '@/components/landing/LiquidTitle';
import Logo from '@/components/ui/Logo';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ProcessPreview from '@/components/landing/ProcessPreview';
import TrustSignals from '@/components/landing/TrustSignals';
import { useTheme } from '@/contexts/ThemeContext';

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();

  // Provide default theme during SSR/initial render
  const currentTheme = theme || 'dark';
  const isDark = currentTheme === 'dark';

  return (
    <PageWrapper>
      {/* 
        FINAL PROFESSIONAL STRUCTURE (CORRECTED)
        - Strict Centered Title Axis
        - Toned Down Panels
        - Card Group Grid matches Left Panel Centerline
      */}
      <div className="min-h-screen lg:h-screen w-full flex flex-col relative overflow-y-auto lg:overflow-hidden bg-transparent">

        {/* Light Mode Backdrop Fade (Only visible in light mode) */}
        {!isDark && <div className="light-backdrop lg:w-1/2" />}

        <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 lg:px-12 py-8 lg:py-0 flex items-center relative z-10">

          <div className="hero-grid gap-x-16">

            {/* LEFT ZONE: Hero Info Panel */}
            <div className={`
               flex flex-col items-center space-y-6
               ${isDark ? 'hero-info-panel-dark' : 'hero-info-panel-light'}
               w-full
            `}>

              {/* 1. LOGO: Centered */}
              <div className="mb-2 w-full flex justify-center">
                <Logo size="medium" priority={true} className="opacity-90 hover:opacity-100 transition-opacity" />
              </div>

              {/* 2. TITLE: LOCKED CENTER */}
              <div className="title-wrap">
                <LiquidTitle />
                <div className="title-divider" />
              </div>

              {/* 3. PROCESS STEPS: Centered Horizontal Pills */}
              <div className="w-full hidden lg:flex justify-center mt-6 bg-transparent">
                <ProcessPreview mode="horizontal" />
              </div>

              {/* Mobile: Steps */}
              <div className="lg:hidden w-full order-3 mt-6">
                <ProcessPreview mode="compact" />
              </div>
            </div>

            {/* RIGHT ZONE: Card Stage */}
            <div className="w-full h-full flex flex-col justify-center">

              <div className="card-stage w-full">

                {/* Card Group Container */}
                <StaggerContainer
                  staggerDelay={0.15}
                  className="card-group items-start"
                >
                  {/* PRIMARY ACTION: Submit */}
                  <StaggerItem className="w-full">
                    <EnhancedActionCard
                      index={0}
                      title="Submit No Dues"
                      subtitle="Apply for semester-end or degree completion clearance."
                      icon={FileCheck}
                      onClick={() => router.push('/student/submit-form')}
                      variant="primary"
                      aria-label="Submit No Dues Form"
                    />
                  </StaggerItem>

                  {/* SECONDARY ACTION: Check Status */}
                  <StaggerItem className="w-full">
                    <EnhancedActionCard
                      index={1}
                      title="Check Status"
                      subtitle="Track your application status via registration number."
                      icon={Search}
                      onClick={() => router.push('/student/check-status')}
                      variant="secondary"
                      aria-label="Check Status"
                    />
                  </StaggerItem>
                </StaggerContainer>

                {/* Trust Signals inside stage for coherence */}
                <div className="hidden lg:flex justify-center mt-6 order-last">
                  <TrustSignals mode="horizontal" />
                </div>
              </div>

              {/* Mobile: Trust Signals */}
              <div className="lg:hidden mt-6 order-last">
                <TrustSignals mode="compact" />
              </div>

            </div>
          </div>
        </main>

        {/* FOOTER: Fixed Bottom Desktop */}
        <footer className="w-full py-4 lg:absolute lg:bottom-4 left-0 text-center pointer-events-none relative z-20">
          <div className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-black/30'}`}>
            Jaipur Engineering College and Research Centre
          </div>
        </footer>

      </div>
    </PageWrapper>
  );
}
