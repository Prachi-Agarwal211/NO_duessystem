'use client';

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * StatsCard Component - Displays key performance metrics
 * Fully theme-aware with dynamic colors for light/dark modes
 *
 * @param {string} title - Stat label/title
 * @param {string|number} value - Main stat value to display
 * @param {string} change - Change description (e.g., "+12% from last period")
 * @param {string} trend - Trend direction: 'up' or 'down'
 * @param {string} color - Tailwind color class for icon background
 */
function StatsCard({ title, value, change, trend, color }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <GlassCard className="p-6 hover:scale-[1.02] transition-transform duration-300">
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
            {value}
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
      <p className={`text-sm mt-3 font-medium ${
        trend === 'up'
          ? 'text-green-500 dark:text-green-400'
          : 'text-red-500 dark:text-red-400'
      }`}>
        {change}
      </p>
    </GlassCard>
  );
}

// Memoize to prevent unnecessary re-renders (safe for real-time as props change triggers update)
export default React.memo(StatsCard, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.change === nextProps.change &&
    prevProps.trend === nextProps.trend &&
    prevProps.color === nextProps.color
  );
});