'use client';

import { useTheme } from '@/contexts/ThemeContext';

/**
 * Safe theme hook that provides a default value during SSR/initial render
 * Prevents errors when theme is null during hydration
 */
export function useSafeTheme() {
  const { theme, toggleTheme } = useTheme();
  
  // Provide default theme during SSR/initial render
  const safeTheme = theme || 'dark';
  const isDark = safeTheme === 'dark';
  
  return {
    theme: safeTheme,
    isDark,
    toggleTheme,
  };
}