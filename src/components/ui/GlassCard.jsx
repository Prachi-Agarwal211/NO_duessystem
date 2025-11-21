'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function GlassCard({ children, className = "", ...props }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div 
      className={`
        backdrop-blur-md 
        rounded-xl sm:rounded-2xl 
        p-4 sm:p-6 lg:p-8
        border
        transition-all duration-700 ease-smooth
        ${isDark 
          ? 'bg-white/[0.02] border-white/10 shadow-2xl shadow-black/50' 
          : 'bg-white border-black/5 shadow-[0_15px_40px_rgba(0,0,0,0.04)]'
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}