'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * StatusBadge - Glossy, glass-morphic status indicator
 * Features backdrop blur, gradient overlays, and theme-aware colors
 *
 * @param {string} status - Status type (pending, approved, rejected, etc.)
 * @param {string} className - Additional classes
 */
function StatusBadge({ status, className = "" }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Status color configurations with gradients
  const statusConfig = {
    pending: {
      bg: 'from-yellow-500/80 to-yellow-600/90',
      border: 'border-yellow-400/30',
      glow: 'shadow-[0_0_15px_rgba(234,179,8,0.3)]',
    },
    approved: {
      bg: 'from-green-500/80 to-green-600/90',
      border: 'border-green-400/30',
      glow: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]',
    },
    rejected: {
      bg: 'from-red-500/80 to-red-600/90',
      border: 'border-red-400/30',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    },
    in_progress: {
      bg: 'from-blue-500/80 to-blue-600/90',
      border: 'border-blue-400/30',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    },
    completed: {
      bg: 'from-purple-500/80 to-purple-600/90',
      border: 'border-purple-400/30',
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    },
    screenshot_uploaded: {
      bg: 'from-orange-500/80 to-orange-600/90',
      border: 'border-orange-400/30',
      glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    },
  };

  const config = statusConfig[status] || {
    bg: 'from-gray-500/80 to-gray-600/90',
    border: 'border-gray-400/30',
    glow: 'shadow-[0_0_15px_rgba(107,114,128,0.3)]',
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-full px-3 py-1
        text-xs font-semibold text-white
        backdrop-blur-sm
        bg-gradient-to-r ${config.bg}
        border ${config.border}
        ${isDark ? config.glow : 'shadow-sm'}
        transition-all duration-300
        hover:scale-105 hover:brightness-110
        ${className}
      `}
    >
      {/* Glossy overlay effect */}
      <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      
      {/* Text content */}
      <span className="relative z-10">
        {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
      </span>
    </span>
  );
}

// Memoize to prevent unnecessary re-renders
export default React.memo(StatusBadge);