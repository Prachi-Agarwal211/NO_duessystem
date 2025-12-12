'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function CardSkeleton({ count = 4 }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`p-6 rounded-xl border backdrop-blur-md animate-pulse transition-colors duration-700 ${
            isDark
              ? 'bg-white/5 border-white/10'
              : 'bg-white border-black/10 shadow-sm'
          }`}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          {/* Icon skeleton */}
          <div className={`w-12 h-12 rounded-full mb-4 transition-colors duration-700 ${
            isDark ? 'bg-gray-700' : 'bg-gray-200'
          }`} />
          
          {/* Title skeleton */}
          <div className={`h-4 w-24 rounded mb-2 transition-colors duration-700 ${
            isDark ? 'bg-gray-700' : 'bg-gray-200'
          }`} />
          
          {/* Value skeleton */}
          <div className={`h-8 w-16 rounded mb-2 transition-colors duration-700 ${
            isDark ? 'bg-gray-600' : 'bg-gray-300'
          }`} />
          
          {/* Subtitle skeleton */}
          <div className={`h-3 w-32 rounded transition-colors duration-700 ${
            isDark ? 'bg-gray-700' : 'bg-gray-200'
          }`} />
        </div>
      ))}
    </div>
  );
}