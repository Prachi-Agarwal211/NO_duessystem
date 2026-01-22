'use client';

import React from 'react';

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
  // Theme-based styling
  const getThemeClasses = () => {
    switch (theme) {
      case 'corporate':
        return 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-200/50';
      case 'executive':
        return 'bg-gradient-to-br from-purple-50/50 to-pink-50/50 border border-purple-200/50';
      case 'professional':
        return 'bg-gradient-to-br from-cyan-50/50 to-emerald-50/50 border border-cyan-200/50';
      case 'jecrc':
      default:
        return 'bg-gradient-to-br from-red-50/50 to-pink-50/50 border border-red-200/50';
    }
  };

  // Variant-based styling
  const getVariantClasses = () => {
    switch (variant) {
      case 'glass':
        return 'backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl';
      case 'elegant':
        return 'bg-white/80 border border-gray-200/50 shadow-lg';
      case 'premium':
        return 'bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-xl';
      case 'dark':
        return 'bg-gradient-to-br from-gray-900/80 to-black/80 border border-gray-700/50 shadow-xl';
      case 'default':
      default:
        return 'bg-white border border-gray-200 shadow-lg';
    }
  };

  // Floating animation
  const floatingStyle = floating ? {
    animation: 'float 6s ease-in-out infinite'
  } : {};

  const cardClasses = `
    relative overflow-hidden rounded-2xl p-6
    ${getVariantClasses()}
    ${getThemeClasses()}
    ${hoverable ? 'hover:shadow-2xl hover:scale-[1.02] transition-all duration-500' : ''}
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
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-white/10 rounded-full -translate-y-12 translate-x-12 blur-xl" />
    </div>
  );
}
