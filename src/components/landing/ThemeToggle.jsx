'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  // Provide default theme during SSR/initial render
  const currentTheme = theme || 'dark';
  const isDark = currentTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`
        interactive fixed top-8 right-8 z-50
        p-3 rounded-full
        transition-all duration-700 ease-smooth
        backdrop-blur-md border
        group
        hover:scale-110 active:scale-95
        ${isDark
          ? 'bg-white/5 text-white hover:bg-white/10 border-white/10 shadow-neon-white hover:shadow-neon-white-lg'
          : 'bg-gradient-to-br from-gray-50 to-white text-black hover:from-white hover:to-gray-50 border-black/10 shadow-sharp-black hover:shadow-sharp-black-lg'
        }
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Accent glow on hover */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-jecrc-red/0 to-jecrc-red/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Icon with animation */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentTheme}
          initial={{ y: -20, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 20, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative z-10"
        >
          {isDark ? (
            <Sun size={20} className="group-hover:text-yellow-300 transition-colors duration-300" />
          ) : (
            <Moon size={20} className="group-hover:text-jecrc-red transition-colors duration-300" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}