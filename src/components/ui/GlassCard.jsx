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
        rounded-xl sm:rounded-2xl
        p-4 sm:p-6 lg:p-8
        border
        transition-all duration-700 ease-smooth
        animate-fade-in
        ${isDark
          ? `
            backdrop-blur-xl
            bg-black/80
            border-jecrc-red/20
            ${variantStyles[variant]}
            hover:border-jecrc-red/40
            hover:bg-black/90
            text-white
            shadow-[0_0_40px_rgba(196,30,58,0.15)]
            hover:shadow-[0_0_60px_rgba(196,30,58,0.25)]
          `
          : `
            bg-white
            border-gray-200
            ${variantStyles[variant]}
            hover:border-gray-300
            text-ink-black
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