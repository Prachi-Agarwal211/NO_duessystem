'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * GlassCard - Premium glassmorphic container with interactive glow effects
 * Automatically adapts shadow and styling based on theme
 *
 * Features:
 * - Light Mode: Sharp 3D shadows (Neumorphic depth)
 * - Dark Mode: Neon border glow with red accent (Cyber-professional)
 * - Smooth hover transitions with scale effect
 * - Backdrop blur for glass effect
 * - Animated border glow on hover
 *
 * @param {React.ReactNode} children - Card content
 * @param {string} className - Additional Tailwind classes
 * @param {boolean} hover - Enable hover scale effect (default: true)
 * @param {string} variant - Style variant: 'default' | 'elevated' | 'flat'
 */
export default function GlassCard({
  children,
  className = "",
  hover = true,
  variant = 'default',
  ...props
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Variant-specific styles with glow
  const variantStyles = {
    default: isDark
      ? 'shadow-neon-white hover:shadow-neon-white-lg'
      : 'shadow-sharp-black hover:shadow-sharp-black-lg',
    elevated: isDark
      ? 'shadow-neon-white-lg hover:shadow-neon-white-xl'
      : 'shadow-sharp-black-lg hover:shadow-sharp-black-xl',
    flat: 'shadow-sm hover:shadow-md',
  };

  return (
    <div
      className={`
        relative
        rounded-xl sm:rounded-2xl
        p-4 sm:p-6 lg:p-8
        border
        transition-all duration-500 ease-spring
        animate-fade-in
        ${isDark
          ? `
            backdrop-blur-xl
            bg-black/80
            border-jecrc-red/20
            ${variantStyles[variant]}
            hover:border-jecrc-red/50
            hover:bg-black/90
            text-white
            before:absolute before:inset-0 before:rounded-xl sm:before:rounded-2xl
            before:p-[2px] before:bg-gradient-to-r before:from-jecrc-red/0 
            before:via-jecrc-red/50 before:to-jecrc-red/0
            before:opacity-0 hover:before:opacity-100
            before:transition-opacity before:duration-700
            before:pointer-events-none before:-z-10
            before:animate-border-flow
          `
          : `
            bg-white
            border-gray-200
            ${variantStyles[variant]}
            hover:border-jecrc-red/30
            hover:bg-gradient-to-br hover:from-white hover:to-jecrc-pink/10
            text-ink-black
          `
        }
        ${hover ? 'hover:scale-[1.01] active:scale-[0.99] hover:-translate-y-0.5' : ''}
        ${className}
      `}
      style={{
        willChange: hover ? 'transform, box-shadow' : 'auto',
        transform: 'translateZ(0)', // GPU acceleration
      }}
      {...props}
    >
      {/* Subtle inner glow for dark mode */}
      {isDark && (
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-jecrc-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}