'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function PearlGradientOverlay({ 
  children, 
  intensity = 'light', // 'light', 'medium', 'strong'
  className = '' 
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Enhanced opacity levels for better visibility (40-60% range)
  const intensities = {
    light: isDark ? 'opacity-[0.40]' : 'opacity-[0.45]',
    medium: isDark ? 'opacity-[0.50]' : 'opacity-[0.55]',
    strong: isDark ? 'opacity-[0.60]' : 'opacity-[0.65]'
  };

  return (
    <div className={`relative ${className}`}>
      {/* Pearl gradient overlay - PERFORMANCE OPTIMIZED */}
      <div 
        className={`
          absolute inset-0 rounded-xl pointer-events-none
          bg-gradient-to-br from-transparent via-white/20 to-transparent
          ${intensities[intensity]}
          transition-opacity duration-700
        `}
        style={{
          // Performance: Use transform instead of position changes
          transform: 'translateZ(0)',
          willChange: 'opacity',
          // Enhanced pearl shimmer effect with higher visibility
          background: isDark
            ? `linear-gradient(135deg,
                transparent 0%,
                rgba(255,255,255,0.25) 25%,
                rgba(196,30,58,0.15) 50%,
                rgba(255,255,255,0.25) 75%,
                transparent 100%)`
            : `linear-gradient(135deg,
                transparent 0%,
                rgba(255,229,233,0.5) 25%,
                rgba(196,30,58,0.25) 50%,
                rgba(255,229,233,0.5) 75%,
                transparent 100%)`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}