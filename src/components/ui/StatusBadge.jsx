'use client';

import React from 'react';

/**
 * StatusBadge - Consistent status indicator with proper theming
 * Uses Tailwind's dark: classes instead of theme context for better performance
 *
 * @param {string} status - Status type (pending, approved, rejected, etc.)
 * @param {string} className - Additional classes
 */
function StatusBadge({ status, className = "" }) {

  // Unified status color configurations using Tailwind dark: classes
  const statusClasses = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30',
    approved: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30',
    rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
    completed: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30',
    screenshot_uploaded: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30',
  };

  const classes = statusClasses[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 border text-xs font-semibold transition-all duration-200 ${classes} ${className}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
    </span>
  );
}

export default React.memo(StatusBadge);