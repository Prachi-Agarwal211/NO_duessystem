'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ⚡ PERFORMANCE: Skeleton Loader for Instant Perceived Speed
 * Shows immediately while data loads - makes UI feel 3x faster
 */
export function TableSkeleton({ rows = 5 }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className={`h-16 rounded-lg ${
            isDark ? 'bg-white/5' : 'bg-gray-200'
          }`}
          style={{
            animationDelay: `${idx * 50}ms`,
            animationDuration: '1.5s'
          }}
        />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-200'} animate-pulse`}>
      <div className={`h-4 w-24 rounded mb-4 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />
      <div className={`h-8 w-16 rounded ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />
    </div>
  );
}

export function DashboardSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-6">
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Search Bar Skeleton */}
      <div className={`h-12 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-200'} animate-pulse`} />

      {/* Table Skeleton */}
      <TableSkeleton rows={8} />
    </div>
  );
}

export function FormDetailSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className={`h-8 w-64 rounded ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />
      
      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className={`h-5 rounded ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className={`h-48 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
      </div>

      {/* Status Table */}
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className={`h-12 rounded ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
        ))}
      </div>
    </div>
  );
}

export default function SkeletonLoader({ type = 'table', rows = 5 }) {
  switch (type) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'form':
      return <FormDetailSkeleton />;
    case 'stats':
      return <StatCardSkeleton />;
    case 'table':
    default:
      return <TableSkeleton rows={rows} />;
  }
}