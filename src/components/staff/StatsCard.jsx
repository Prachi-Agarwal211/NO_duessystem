'use client';

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

function StaffStatsCard({ title, value, subtitle, icon: Icon, color, loading }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Map color names to Tailwind classes
  const colorMap = {
    'yellow': 'bg-yellow-500',
    'green': 'bg-green-500',
    'red': 'bg-red-500',
    'blue': 'bg-blue-500',
    'purple': 'bg-purple-500'
  };

  const bgColor = colorMap[color] || color;

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
            {loading ? (
              <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>
            ) : (
              typeof value === 'number' ? (
                <AnimatedCounter
                  value={value}
                  duration={1.5}
                  delay={0.2}
                />
              ) : (
                value
              )
            )}
          </p>
          <p className={`text-sm mt-2 ${
            isDark ? 'text-gray-500' : 'text-gray-500'
          }`}>
            {subtitle}
          </p>
        </div>

        {/* Right: Icon */}
        <div className="relative">
          <div className={`p-3 rounded-full ${bgColor}`}>
            {Icon && <Icon className="w-6 h-6 text-white" />}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default React.memo(StaffStatsCard);