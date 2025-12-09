'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// Hook to detect mobile devices
function useDeviceDetection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}

export default function AuroraBackground({ className = '', children }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isMobile = useDeviceDetection();

  return (
    <div className={`relative flex flex-col w-full min-h-screen overflow-hidden ${className}`}>
      {/* Background Layer - Optimized for mobile */}
      <div className="fixed inset-0 w-full h-full transition-colors duration-700 ease-in-out z-[5] pointer-events-none">
        {/* Strong base color overlay */}
        <div className={`absolute inset-0 transition-colors duration-700 ${
          isDark ? 'bg-black/80' : 'bg-white/40'
        }`} />
        
        {/* Animated Mesh Gradients - Reduced blur on mobile for 60fps */}
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
            ${isMobile ? 'blur-[60px]' : 'blur-[120px]'} 
            animate-blob-slow
            rounded-full
            will-change-transform
          `} />
          
          {/* Large Red/Rose Blob - Top Right */}
          <div className={`
            absolute top-[-20%] right-[-20%] w-[70%] h-[70%]
            bg-gradient-to-bl
            ${isDark
              ? 'from-jecrc-red-bright/50 via-jecrc-red-dark/25 to-transparent'
              : 'from-rose-600/40 via-pink-600/30 to-transparent mix-blend-multiply'}
            ${isMobile ? 'blur-[60px]' : 'blur-[120px]'}
            animate-blob-slow animation-delay-2000
            rounded-full
            will-change-transform
          `} />
          
          {/* Large Purple/Blue Blob - Bottom Left */}
          <div className={`
            absolute bottom-[-20%] left-[-20%] w-[70%] h-[70%]
            bg-gradient-to-tr
            ${isDark
              ? 'from-purple-600/40 via-purple-900/20 to-transparent'
              : 'from-blue-600/40 via-indigo-500/30 to-transparent mix-blend-multiply'}
            ${isMobile ? 'blur-[60px]' : 'blur-[120px]'}
            animate-blob-slow animation-delay-4000
            rounded-full
            will-change-transform
          `} />
          
          {/* Center Glow - Additional prominence */}
          <div className={`
            absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%]
            bg-gradient-to-br
            ${isDark
              ? 'from-jecrc-red/30 to-transparent'
              : 'from-rose-500/30 to-transparent mix-blend-multiply'}
            ${isMobile ? 'blur-[50px]' : 'blur-[100px]'}
            rounded-full
            animate-pulse-slow
            will-change-transform
          `} />
        </div>

        {/* Subtle grain texture overlay for depth */}
        <div 
          className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'repeat',
            backgroundSize: '128px 128px'
          }}
        />
      </div>
      
      {/* Content Layer - MUST be above aurora */}
      <div className="relative z-10 w-full min-h-screen pointer-events-auto">
        {children}
      </div>
    </div>
  );
}
