'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function GlobalBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
      {/* 1. Base Layer - Prevents white flashes */}
      <div className={`absolute inset-0 transition-colors duration-700 ${
        isDark ? 'bg-black' : 'bg-white'
      }`} />

      {/* 2. JECRC Campus Image (Subtle watermark) */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{
          backgroundImage: "url('/assets/9-1-1536x720.jpg')",
          opacity: isDark ? 0.08 : 0.35,
          mixBlendMode: isDark ? 'screen' : 'multiply',
          filter: isDark ? 'brightness(0.6) contrast(0.8) saturate(0.2) blur(1.5px)' : 'brightness(0.9) contrast(1.1)'
        }}
      />

      {/* 3. Static Gradient Mesh (JECRC Red Theme) */}
      <div 
        className={`absolute inset-0 transition-opacity duration-700 ${
          isDark ? 'opacity-40' : 'opacity-30'
        }`}
        style={{
          backgroundImage: isDark 
            ? `
              radial-gradient(at 0% 0%, rgba(196, 30, 58, 0.4) 0%, transparent 50%), 
              radial-gradient(at 50% 0%, rgba(139, 0, 0, 0.3) 0%, transparent 50%), 
              radial-gradient(at 100% 0%, rgba(196, 30, 58, 0.35) 0%, transparent 50%)
            `
            : `
              radial-gradient(at 0% 0%, rgba(255, 229, 233, 0.6) 0%, transparent 50%), 
              radial-gradient(at 50% 0%, rgba(255, 248, 248, 0.5) 0%, transparent 50%), 
              radial-gradient(at 100% 0%, rgba(255, 209, 217, 0.6) 0%, transparent 50%)
            `
        }}
      />

      {/* 4. Aurora Animation (GPU-accelerated CSS-only) */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${
        isDark ? 'opacity-30' : 'opacity-20'
      } animate-aurora-flow`}>
        <div 
          className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%]"
          style={{
            background: isDark
              ? 'conic-gradient(from 90deg at 50% 50%, #00000000 50%, rgba(196, 30, 58, 0.15) 50%), radial-gradient(rgba(196, 30, 58, 0.2) 0%, transparent 50%)'
              : 'conic-gradient(from 90deg at 50% 50%, #00000000 50%, rgba(255, 229, 233, 0.3) 50%), radial-gradient(rgba(255, 209, 217, 0.3) 0%, transparent 50%)'
          }}
        />
      </div>

      {/* 5. Subtle Grid Overlay (Optional) */}
      <div 
        className={`absolute inset-0 bg-center transition-opacity duration-700 ${
          isDark ? 'opacity-5' : 'opacity-10'
        }`}
        style={{ 
          backgroundImage: "url('/grid.svg')",
          backgroundSize: '30px 30px',
          maskImage: 'linear-gradient(180deg, white, rgba(255, 255, 255, 0))'
        }} 
      />

      {/* 6. Subtle grain texture for depth */}
      <div 
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px'
        }}
      />
    </div>
  );
}