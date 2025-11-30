'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function AuroraBackground({ className = '', children }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`relative flex flex-col w-full min-h-screen overflow-hidden ${className}`}>
      {/* Background Layer - VERY HIGH z-index to be visible above everything */}
      <div className="fixed inset-0 w-full h-full transition-colors duration-700 ease-in-out z-[5] pointer-events-none">
        {/* Strong base color overlay - Adjusted for better light mode visibility */}
        <div className={`absolute inset-0 transition-colors duration-700 ${
          isDark ? 'bg-black/80' : 'bg-white/40'
        }`} />
        
        {/* HIGHLY VISIBLE Mesh Gradients - Much stronger colors and opacity */}
        <div className={`
          absolute inset-0
          w-full h-full
          animate-aurora
          opacity-100
        `}>
          {/* Large Red/Pink Blob - Top Left */}
          <div className={`
            absolute top-[-20%] left-[-20%] w-[70%] h-[70%]
            bg-gradient-to-br
            ${isDark
              ? 'from-jecrc-red/60 via-jecrc-red/30 to-transparent'
              : 'from-red-600/40 via-rose-500/30 to-transparent mix-blend-multiply'}
            blur-[120px] animate-blob-slow
            rounded-full
          `} />
          
          {/* Large Red/Rose Blob - Top Right */}
          <div className={`
            absolute top-[-20%] right-[-20%] w-[70%] h-[70%]
            bg-gradient-to-bl
            ${isDark
              ? 'from-jecrc-red-bright/50 via-jecrc-red-dark/25 to-transparent'
              : 'from-rose-600/40 via-pink-600/30 to-transparent mix-blend-multiply'}
            blur-[120px] animate-blob-slow animation-delay-2000
            rounded-full
          `} />
          
          {/* Large Purple/Blue Blob - Bottom Left */}
          <div className={`
            absolute bottom-[-20%] left-[-20%] w-[70%] h-[70%]
            bg-gradient-to-tr
            ${isDark
              ? 'from-purple-600/40 via-purple-900/20 to-transparent'
              : 'from-blue-600/40 via-indigo-500/30 to-transparent mix-blend-multiply'}
            blur-[120px] animate-blob-slow animation-delay-4000
            rounded-full
          `} />
          
          {/* Center Glow - Additional prominence */}
          <div className={`
            absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%]
            bg-gradient-to-br
            ${isDark
              ? 'from-jecrc-red/30 to-transparent'
              : 'from-rose-500/30 to-transparent mix-blend-multiply'}
            blur-[100px]
            rounded-full
            animate-pulse-slow
          `} />
        </div>
      </div>
      
      {/* Content Layer - MUST be above aurora */}
      <div className="relative z-10 w-full min-h-screen pointer-events-auto">
        {children}
      </div>
    </div>
  );
}
