'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Clean GlassCard Component
 * Premium styling with proper light/dark mode support
 */

export default function GlassCard({
  children,
  className = "",
  onClick,
  variant = 'default',
  hoverable = true,
  ...props
}) {
  const { theme: currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  // Clean styling - white cards in light mode, dark cards in dark mode
  const getVariantClasses = () => {
    if (isDark) {
      switch (variant) {
        case 'glass':
          return 'bg-gray-900/80 backdrop-blur-xl border-gray-700 shadow-xl';
        case 'elegant':
          return 'bg-gray-800/80 border-gray-600 shadow-lg';
        case 'premium':
          return 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600 shadow-xl';
        case 'default':
        default:
          return 'bg-gray-800 border-gray-700 shadow-lg backdrop-blur-md';
      }
    } else {
      switch (variant) {
        case 'glass':
          return 'bg-white/80 backdrop-blur-xl border-gray-200 shadow-lg';
        case 'elegant':
          return 'bg-white border-gray-200 shadow-md';
        case 'premium':
          return 'bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-lg';
        case 'default':
        default:
          return 'bg-white border-gray-200 shadow-md backdrop-blur-md';
      }
    }
  };

  const cardClasses = `
    relative overflow-hidden rounded-xl p-5
    ${getVariantClasses()}
    ${hoverable ? 'hover:shadow-lg hover:scale-[1.005] transition-all duration-300 cursor-pointer' : ''}
    ${className}
  `;

  return (
    <div
      onClick={onClick}
      className={cardClasses}
      {...props}
    >
      {/* Subtle gradient accent on hover */}
      <div className={`
        absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent 
        opacity-0 hover:opacity-100 transition-opacity duration-300
        ${isDark ? 'to-jecrc-red/5' : 'to-jecrc-red/5'}
      `} />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Subtle corner accent */}
      <div className={`
        absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-jecrc-red/10 rounded-full 
        -translate-y-8 translate-x-8 blur-lg
      `} />
    </div>
  );
}
