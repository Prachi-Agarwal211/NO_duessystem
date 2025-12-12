'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

function StatsCard({ title, value, subtitle, icon: Icon, color = 'blue', loading = false }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colorClasses = {
    blue: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
    green: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600',
    red: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600',
    yellow: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600',
    purple: isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600',
  };

  if (loading) {
    return (
      <div
        className={`p-6 rounded-xl border transition-all duration-700 ${
          isDark
            ? 'bg-white/5 border-white/10'
            : 'bg-white border-black/10'
        }`}
      >
        <div className="animate-pulse">
          <div className={`w-12 h-12 rounded-lg mb-4 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          <div className={`h-4 rounded mb-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          <div className={`h-8 rounded mb-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          <div className={`h-3 w-2/3 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-6 rounded-xl border transition-all duration-700 hover:scale-105 cursor-pointer ${
        isDark
          ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
          : 'bg-white border-black/10 hover:shadow-lg hover:border-black/20'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {Icon && <Icon className="w-6 h-6" />}
        </div>
      </div>
      
      <h3
        className={`text-sm font-medium mb-2 transition-colors duration-700 ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}
      >
        {title}
      </h3>
      
      <div
        className={`text-3xl font-bold mb-1 transition-colors duration-700 ${
          isDark ? 'text-white' : 'text-ink-black'
        }`}
      >
        {value}
      </div>
      
      {subtitle && (
        <p
          className={`text-xs transition-colors duration-700 ${
            isDark ? 'text-gray-500' : 'text-gray-500'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders (safe for real-time as props change triggers update)
export default React.memo(StatsCard, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.color === nextProps.color &&
    prevProps.loading === nextProps.loading
  );
});