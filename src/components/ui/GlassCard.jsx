'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * GlassCard - Premium glassmorphic container with 3D depth effects
 * Automatically adapts shadow and styling based on theme
 *
 * Features:
 * - Light Mode: Sharp 3D shadows (Neumorphic depth)
 * - Dark Mode: Neon white glow (Cyber-professional)
 * - Smooth hover transitions with scale effect
 * - Backdrop blur for glass effect
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
      ? 'shadow-neon-white hover:shadow-neon-white-lg animate-glow-pulse-white'
      : 'shadow-sharp-black hover:shadow-sharp-black-lg',
    elevated: isDark
      ? 'shadow-neon-white-lg hover:shadow-neon-white-xl animate-glow-pulse-white'
      : 'shadow-sharp-black-lg hover:shadow-sharp-black-xl',
    flat: 'shadow-sm hover:shadow-md',
  };

  return (
    <div
      className={`
        backdrop-blur-xl
        rounded-xl sm:rounded-2xl
        p-4 sm:p-6 lg:p-8
        border
        transition-all duration-700 ease-smooth
        animate-fade-in
        ${isDark
          ? `
            bg-white/[0.02]
            border-white/10
            ${variantStyles[variant]}
            hover:border-white/20
            hover:bg-white/[0.04]
            text-white
          `
          : `
            bg-gradient-to-br from-white/90 via-cream/80 to-jecrc-pink/30
            border-jecrc-red/10
            ${variantStyles[variant]}
            hover:border-jecrc-red/20
            hover:from-white hover:via-jecrc-pink/20 hover:to-jecrc-rose/30
            text-pure-black
          `
        }
        ${hover ? 'hover:scale-[1.01] hover:animate-float active:scale-[0.99]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}