'use client';

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

/**
 * Unified StatsCard Component - Displays key performance metrics
 * Supports both admin and staff dashboard use cases
 * Fully theme-aware with dynamic colors for light/dark modes
 *
 * @param {string} title - Stat label/title
 * @param {string|number} value - Main stat value to display
 * @param {string} [change] - Change description for admin view (e.g., "+12%")
 * @param {string} [subtitle] - Subtitle text for staff view
 * @param {string} [trend] - Trend direction: 'up' or 'down' (admin view)
 * @param {React.Component} [icon] - Icon component (staff view)
 * @param {string} [color] - Color variant
 * @param {boolean} [loading] - Show loading skeleton
 * @param {string} [variant] - 'admin' or 'staff' (auto-detected from props)
 */
function StatsCard({ 
  title, 
  value, 
  change,
  subtitle, 
  trend, 
  icon: Icon, 
  color = 'blue', 
  loading = false 
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Auto-detect variant based on props
  const variant = trend !== undefined ? 'admin' : 'staff';

  // Color classes for staff variant
  const colorClasses = {
    blue: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
    green: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600',
    red: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600',
    yellow: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600',
    purple: isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600',
  };

  // Tailwind color classes for admin variant
  const adminColors = {
    'bg-blue-500': color === 'bg-blue-500',
    'bg-green-500': color === 'bg-green-500',
    'bg-red-500': color === 'bg-red-500',
    'bg-yellow-500': color === 'bg-yellow-500',
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

  // Admin variant - with trend indicators
  if (variant === 'admin') {
    return (
      <GlassCard className="p-6 hover:scale-[1.02] transition-transform duration-300 cursor-pointer">
        <div className="flex items-center justify-between">
          {/* Left: Title and Value */}
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {title}
            </p>
            <p className={`text-2xl font-bold mt-1 ${
              isDark ? 'text-white' : 'text-ink-black'
            }`}>
              {typeof value === 'number' ? (
                <AnimatedCounter
                  value={value}
                  duration={1.5}
                  delay={0.2}
                />
              ) : (
                value
              )}
            </p>
          </div>

          {/* Right: Trend Icon with Gradient Background */}
          <div className="relative">
            {/* Gradient Background Layer */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-600 to-black opacity-10" />
            
            {/* Icon Container */}
            <div className={`relative p-3 rounded-full ${color}`}>
              {trend === 'up' ? (
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Trending up"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Trending down"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Change Indicator */}
        {change && (
          <p className={`text-sm mt-3 font-medium ${
            trend === 'up'
              ? 'text-green-500 dark:text-green-400'
              : 'text-red-500 dark:text-red-400'
          }`}>
            {change}
          </p>
        )}
      </GlassCard>
    );
  }

  // Staff variant - with icon and subtitle
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
        {typeof value === 'number' ? (
          <AnimatedCounter
            value={value}
            duration={1.5}
            delay={0.2}
          />
        ) : (
          value
        )}
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

// Memoize to prevent unnecessary re-renders
export default React.memo(StatsCard, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.change === nextProps.change &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.trend === nextProps.trend &&
    prevProps.color === nextProps.color &&
    prevProps.loading === nextProps.loading
  );
});