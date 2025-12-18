'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * StatusBadge - Consistent status indicator with proper theming
 *
 * @param {string} status - Status type (pending, approved, rejected, etc.)
 * @param {string} className - Additional classes
 */
function StatusBadge({ status, className = "" }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Unified status color configurations
  const statusConfig = {
    pending: {
      lightBg: 'bg-yellow-100',
      lightText: 'text-yellow-800',
      lightBorder: 'border-yellow-200',
      darkBg: 'bg-yellow-500/20',
      darkText: 'text-yellow-400',
      darkBorder: 'border-yellow-500/30',
    },
    approved: {
      lightBg: 'bg-green-100',
      lightText: 'text-green-800',
      lightBorder: 'border-green-200',
      darkBg: 'bg-green-500/20',
      darkText: 'text-green-400',
      darkBorder: 'border-green-500/30',
    },
    rejected: {
      lightBg: 'bg-red-100',
      lightText: 'text-red-800',
      lightBorder: 'border-red-200',
      darkBg: 'bg-red-500/20',
      darkText: 'text-red-400',
      darkBorder: 'border-red-500/30',
    },
    in_progress: {
      lightBg: 'bg-blue-100',
      lightText: 'text-blue-800',
      lightBorder: 'border-blue-200',
      darkBg: 'bg-blue-500/20',
      darkText: 'text-blue-400',
      darkBorder: 'border-blue-500/30',
    },
    completed: {
      lightBg: 'bg-purple-100',
      lightText: 'text-purple-800',
      lightBorder: 'border-purple-200',
      darkBg: 'bg-purple-500/20',
      darkText: 'text-purple-400',
      darkBorder: 'border-purple-500/30',
    },
    screenshot_uploaded: {
      lightBg: 'bg-orange-100',
      lightText: 'text-orange-800',
      lightBorder: 'border-orange-200',
      darkBg: 'bg-orange-500/20',
      darkText: 'text-orange-400',
      darkBorder: 'border-orange-500/30',
    },
  };

  const config = statusConfig[status] || {
    lightBg: 'bg-gray-100',
    lightText: 'text-gray-800',
    lightBorder: 'border-gray-200',
    darkBg: 'bg-gray-500/20',
    darkText: 'text-gray-400',
    darkBorder: 'border-gray-500/30',
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-full px-3 py-1 border
        text-xs font-semibold
        transition-all duration-200
        ${isDark
          ? `${config.darkBg} ${config.darkText} ${config.darkBorder}`
          : `${config.lightBg} ${config.lightText} ${config.lightBorder}`
        }
        ${className}
      `}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
    </span>
  );
}

export default React.memo(StatusBadge);