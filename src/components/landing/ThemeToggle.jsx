'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Theme Toggle Button
 * - Gradient background with subtle glow
 * - Expands on hover to show mode text
 * - Subtle floating animation (offset from support button)
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const currentTheme = theme || 'dark';
  const isDark = currentTheme === 'dark';
  const labelText = isDark ? 'Light Mode' : 'Dark Mode';

  return (
    <motion.button
      onClick={toggleTheme}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        fixed bottom-24 right-8 h-12 rounded-full
        flex items-center z-40 group
        border backdrop-blur-md overflow-hidden
        ${isDark
          ? 'bg-gradient-to-br from-gray-800/80 via-gray-900/90 to-black/80 border-white/20 hover:border-yellow-400/50'
          : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 border-gray-200 hover:border-indigo-400/50 shadow-lg'
        }
      `}
      style={{
        boxShadow: isDark
          ? isHovered
            ? '0 8px 32px rgba(250, 204, 21, 0.2), 0 0 20px rgba(250, 204, 21, 0.1)'
            : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
          : isHovered
            ? '0 8px 32px rgba(99, 102, 241, 0.2), 0 0 20px rgba(99, 102, 241, 0.1)'
            : '0 4px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
        width: isHovered ? '145px' : '48px',
        paddingLeft: isHovered ? '16px' : '12px',
        paddingRight: isHovered ? '16px' : '12px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      initial={{ scale: 0, y: 20 }}
      animate={{
        scale: 1,
        y: [0, -4, 0],
      }}
      transition={{
        scale: { type: "spring", stiffness: 260, damping: 20 },
        y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
      }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Shimmer effect on hover */}
      <div
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, transparent 0%, rgba(250, 204, 21, 0.1) 50%, transparent 100%)'
            : 'linear-gradient(135deg, transparent 0%, rgba(99, 102, 241, 0.05) 50%, transparent 100%)',
        }}
      />

      {/* Pulsing ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 opacity-0 group-hover:opacity-50"
        style={{ borderColor: isDark ? 'rgba(250, 204, 21, 0.5)' : 'rgba(99, 102, 241, 0.5)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0, 0.3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
      />

      <div className="flex items-center gap-2 relative z-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentTheme}
            initial={{ y: -10, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 10, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex-shrink-0"
          >
            {isDark ? (
              <Sun
                size={20}
                className="text-gray-300 group-hover:text-yellow-400 transition-colors duration-300"
                strokeWidth={2}
              />
            ) : (
              <Moon
                size={20}
                className="text-gray-600 group-hover:text-indigo-500 transition-colors duration-300"
                strokeWidth={2}
              />
            )}
          </motion.div>
        </AnimatePresence>
        <span
          className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isDark ? 'text-white' : 'text-gray-700'
            }`}
          style={{
            opacity: isHovered ? 1 : 0,
            width: isHovered ? 'auto' : 0,
            overflow: 'hidden'
          }}
        >
          {labelText}
        </span>
      </div>
    </motion.button>
  );
}