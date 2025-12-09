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

export default function GlobalBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isMobile = useDeviceDetection();

  return (
    <div
      className="fixed inset-0 w-screen h-screen transition-colors duration-700 ease-in-out pointer-events-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        zIndex: 0,
        overflow: 'hidden'
      }}
    >
      {/* Strong base color overlay */}
      <div className={`absolute inset-0 transition-colors duration-700 ${
        isDark ? 'bg-black' : 'bg-white/40'
      }`} />
      
      {/* Animated Mesh Gradients - Enhanced glow for dark mode */}
      <div className={`
        absolute inset-0
        w-full h-full
        animate-aurora
        opacity-100
      `}
      style={{ position: 'absolute' }}
      >
        {/* Large Red/Pink Blob - Top Left - ENHANCED GLOW */}
        <div className={`
          absolute top-[-20%] left-[-20%] w-[70%] h-[70%]
          bg-gradient-to-br
          ${isDark
            ? 'from-jecrc-red/80 via-jecrc-red/50 to-transparent'
            : 'from-red-600/40 via-rose-500/30 to-transparent mix-blend-multiply'}
          ${isMobile ? 'blur-[80px]' : 'blur-[150px]'}
          animate-blob-slow
          rounded-full
          will-change-transform
        `}
        style={{
          boxShadow: isDark ? '0 0 200px 100px rgba(196, 30, 58, 0.3)' : 'none'
        }}
        />
        
        {/* Large Red/Rose Blob - Top Right - ENHANCED GLOW */}
        <div className={`
          absolute top-[-20%] right-[-20%] w-[70%] h-[70%]
          bg-gradient-to-bl
          ${isDark
            ? 'from-jecrc-red-bright/70 via-jecrc-red-dark/40 to-transparent'
            : 'from-rose-600/40 via-pink-600/30 to-transparent mix-blend-multiply'}
          ${isMobile ? 'blur-[80px]' : 'blur-[150px]'}
          animate-blob-slow animation-delay-2000
          rounded-full
          will-change-transform
        `}
        style={{
          boxShadow: isDark ? '0 0 200px 100px rgba(220, 50, 80, 0.3)' : 'none'
        }}
        />
        
        {/* Large Purple/Blue Blob - Bottom Left - ENHANCED GLOW */}
        <div className={`
          absolute bottom-[-20%] left-[-20%] w-[70%] h-[70%]
          bg-gradient-to-tr
          ${isDark
            ? 'from-purple-600/60 via-purple-900/35 to-transparent'
            : 'from-blue-600/40 via-indigo-500/30 to-transparent mix-blend-multiply'}
          ${isMobile ? 'blur-[80px]' : 'blur-[150px]'}
          animate-blob-slow animation-delay-4000
          rounded-full
          will-change-transform
        `}
        style={{
          boxShadow: isDark ? '0 0 200px 100px rgba(147, 51, 234, 0.2)' : 'none'
        }}
        />
        
        {/* Center Glow - ENHANCED for visibility */}
        <div className={`
          absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%]
          bg-gradient-to-br
          ${isDark
            ? 'from-jecrc-red/50 via-jecrc-red/20 to-transparent'
            : 'from-rose-500/30 to-transparent mix-blend-multiply'}
          ${isMobile ? 'blur-[70px]' : 'blur-[130px]'}
          rounded-full
          animate-pulse-slow
          will-change-transform
        `}
        style={{
          boxShadow: isDark ? '0 0 300px 150px rgba(196, 30, 58, 0.25)' : 'none'
        }}
        />
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
  );
}