'use client';

import React from 'react';
import { X } from 'lucide-react';

/**
 * FilterPills - Displays active filters as removable pills
 * Shows active filter values with remove buttons
 * Provides "Clear All" button when multiple filters are active
 */
export default function FilterPills({ filters, onRemoveFilter, onClearAll, isDark = false }) {
  // Get active filters (non-empty values)
  const activeFilters = Object.entries(filters).filter(([_, value]) => value && value.trim());

  // Don't render if no active filters
  if (activeFilters.length === 0) {
    return null;
  }

  // Format filter labels
  const getFilterLabel = (key) => {
    const labels = {
      status: 'Status',
      search: 'Search',
      department: 'Department',
      school: 'School',
      course: 'Course',
      branch: 'Branch'
    };
    return labels[key] || key;
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 p-3 rounded-lg border transition-colors duration-300 ${
      isDark 
        ? 'bg-white/5 border-white/10' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Active Filters:
      </span>
      
      {activeFilters.map(([key, value]) => (
        <button
          key={key}
          onClick={() => onRemoveFilter(key)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-all duration-200 hover:scale-105 active:scale-95 ${
            isDark
              ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
          }`}
          title={`Remove ${getFilterLabel(key)} filter`}
        >
          <span className="font-medium">{getFilterLabel(key)}:</span>
          <span className="max-w-[150px] truncate">{value}</span>
          <X className="w-3.5 h-3.5 flex-shrink-0" />
        </button>
      ))}
      
      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className={`ml-2 px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
            isDark
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
              : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
          }`}
          title="Clear all filters"
        >
          Clear All
        </button>
      )}
    </div>
  );
}