'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function TableSkeleton({ rows = 5, columns = 5 }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="w-full animate-pulse">
      {/* Table Header Skeleton */}
      <div className={`flex gap-4 px-4 sm:px-6 py-3 sm:py-4 mb-2 rounded-t-lg transition-colors duration-700 ${
        isDark ? 'bg-gray-800' : 'bg-gray-50'
      }`}>
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={`h-4 rounded flex-1 transition-colors duration-700 ${
              isDark ? 'bg-gray-700' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Table Rows Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className={`flex gap-4 px-4 sm:px-6 py-4 rounded-lg transition-colors duration-700 ${
              isDark ? 'bg-gray-800/30' : 'bg-gray-50/50'
            }`}
            style={{
              animationDelay: `${rowIndex * 100}ms`
            }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className={`h-4 rounded flex-1 transition-colors duration-700 ${
                  isDark ? 'bg-gray-700/50' : 'bg-gray-200/70'
                }`}
                style={{
                  width: colIndex === 0 ? '25%' : 'auto'
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}