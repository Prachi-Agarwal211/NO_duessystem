'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoadingSpinner({ size = 'md', text = '' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Size variants
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4'
  };

  return (
    <div className="flex flex-col justify-center items-center gap-3">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} transition-colors duration-700 ${
          isDark ? 'border-white border-b-transparent' : 'border-ink-black border-b-transparent'
        }`}
        role="status"
        aria-label="Loading"
      ></div>
      {text && (
        <p className={`text-sm font-medium transition-colors duration-700 ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {text}
        </p>
      )}
    </div>
  );
}