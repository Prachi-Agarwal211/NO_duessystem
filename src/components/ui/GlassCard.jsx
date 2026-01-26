'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Premium GlassCard Component
 * 
 * Enhanced with:
 * - Premium gradients and theme support
 * - Advanced glassmorphism effects
 * - Performance-optimized animations
 * - Theme-aware styling
 * - Floating effects and hover states
 */

export default function GlassCard({
  children,
  className = "",
  onClick,
  variant = 'default',
  theme = 'jecrc',
  floating = false,
  hoverable = true,
  ...props
}) {
  const { theme: currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  // Theme-based styling - Better contrast in both modes
  const getThemeClasses = () => {
    if (isDark) {
      switch (theme) {
        case 'corporate':
          return 'bg-gray-800/80 border-gray-600';
        case 'executive':
          return 'bg-gray-800/80 border-gray-600';
        case 'professional':
          return 'bg-gray-800/80 border-gray-600';
        case 'jecrc':
        default:
          return 'bg-gray-800/80 border-gray-600';
      }
    } else {
      // Light mode - clean and readable
      switch (theme) {
        case 'corporate':
          return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200';
        case 'executive':
          return 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200';
        case 'professional':
          return 'bg-gradient-to-br from-cyan-50 to-emerald-50 border-cyan-200';
        case 'jecrc':
        default:
          return 'bg-gradient-to-br from-gray-50 to-white border-gray-200';
      }
    }
  };

  // Variant-based styling with improved dark mode contrast
  const getVariantClasses = () => {
    if (isDark) {
      switch (variant) {
        case 'glass':
          return 'backdrop-blur-xl bg-gray-900/80 border border-gray-700 shadow-xl';
        case 'elegant':
          return 'bg-gray-800/80 border border-gray-700 shadow-xl';
        case 'premium':
          return 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 shadow-xl';
        case 'dark':
          return 'bg-gray-900 border border-gray-700 shadow-xl';
        case 'default':
        default:
          return 'bg-gray-800/80 border border-gray-700 shadow-xl backdrop-blur-md';
      }
    } else {
      // Light mode - clean and readable
      switch (variant) {
        case 'glass':
          return 'backdrop-blur-xl bg-white/80 border border-gray-200 shadow-lg';
        case 'elegant':
          return 'bg-white/80 border border-gray-200 shadow-lg';
        case 'premium':
          return 'bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg';
        case 'dark':
          return 'bg-gray-800 text-white';
        case 'default':
        default:
          return 'bg-white border border-gray-200 shadow-lg backdrop-blur-md';
      }
    }
  };

  // Floating animation
  const floatingStyle = floating ? {
    animation: 'float 6s ease-in-out infinite'
  } : {};

  const cardClasses = `
    relative overflow-hidden rounded-xl p-5
    ${getVariantClasses()}
    ${getThemeClasses()}
    ${hoverable ? 'hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer' : ''}
    ${className}
  `;

  return (
    <div
      onClick={onClick}
      className={cardClasses}
      style={floatingStyle}
      {...props}
    >
      {/* Premium gradient overlay */}
      <div className={`
        absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent 
        opacity-0 hover:opacity-100 transition-opacity duration-300
        ${isDark ? 'via-white/5' : 'via-gray-100'}
      `} />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Corner accent */}
      <div className={`
        absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-transparent to-jecrc-red/20 rounded-full 
        -translate-y-10 translate-x-10 blur-xl
        ${isDark ? 'to-jecrc-red/10' : 'to-jecrc-red/20'}
      `} />
    </div>
  );
}
