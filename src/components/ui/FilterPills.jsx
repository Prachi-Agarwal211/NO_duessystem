'use client';

import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * FilterPills Component
 * 
 * Displays active filters as removable pill chips with smooth animations.
 * Features:
 * - Individual pill removal with X button
 * - "Clear All" button when multiple filters active
 * - Smooth enter/exit animations with Framer Motion
 * - Theme-aware styling (dark/light mode)
 * - GPU-accelerated animations for 60fps performance
 * 
 * @param {Object} props
 * @param {Object} props.filters - Object containing active filter values { status: '', search: '', department: '' }
 * @param {Function} props.onRemoveFilter - Callback when individual filter is removed (filterKey)
 * @param {Function} props.onClearAll - Callback when "Clear All" is clicked
 * @param {boolean} props.isDark - Theme mode (dark/light)
 */
export default function FilterPills({ filters = {}, onRemoveFilter, onClearAll, isDark = false }) {
  // Convert filters object to array of active filters
  const activeFilters = Object.entries(filters)
    .filter(([key, value]) => value && value.trim() !== '')
    .map(([key, value]) => ({
      key,
      value,
      label: getFilterLabel(key, value)
    }));

  // No filters active - don't render anything
  if (activeFilters.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10"
    >
      <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Active Filters:
      </span>

      <AnimatePresence mode="popLayout">
        {activeFilters.map((filter, index) => (
          <motion.div
            key={filter.key}
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{
              duration: 0.2,
              delay: index * 0.05 // Stagger animation
            }}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              ${isDark 
                ? 'bg-jecrc-red/20 text-jecrc-red border border-jecrc-red/30' 
                : 'bg-jecrc-red/10 text-jecrc-red-dark border border-jecrc-red/20'
              }
              transition-all duration-200 hover:scale-105
            `}
          >
            <span>{filter.label}</span>
            <button
              onClick={() => onRemoveFilter(filter.key)}
              className={`
                p-0.5 rounded-full transition-all duration-200
                ${isDark 
                  ? 'hover:bg-jecrc-red/30' 
                  : 'hover:bg-jecrc-red/20'
                }
                active:scale-90
              `}
              title={`Remove ${filter.key} filter`}
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Clear All Button - Show only when multiple filters */}
      {activeFilters.length > 1 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: activeFilters.length * 0.05 }}
          onClick={onClearAll}
          className={`
            px-3 py-1.5 rounded-full text-xs font-medium
            ${isDark 
              ? 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
            }
            transition-all duration-200 hover:scale-105 active:scale-95
          `}
        >
          Clear All
        </motion.button>
      )}
    </motion.div>
  );
}

/**
 * Helper function to format filter labels
 * Converts filter keys and values into human-readable labels
 */
function getFilterLabel(key, value) {
  const labels = {
    status: {
      pending: 'Status: Pending',
      in_progress: 'Status: In Progress',
      completed: 'Status: Completed',
      rejected: 'Status: Rejected',
      approved: 'Status: Approved'
    }
  };

  // Check if we have a predefined label
  if (labels[key] && labels[key][value]) {
    return labels[key][value];
  }

  // Format key name (remove underscores, capitalize)
  const formattedKey = key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // For search, truncate long values
  if (key === 'search') {
    const truncated = value.length > 20 ? value.substring(0, 20) + '...' : value;
    return `Search: "${truncated}"`;
  }

  // For department, show full name
  if (key === 'department') {
    return `Dept: ${value}`;
  }

  // Default format
  return `${formattedKey}: ${value}`;
}