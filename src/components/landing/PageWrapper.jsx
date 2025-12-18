'use client';

import ThemeToggle from './ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

export default function PageWrapper({ children, showThemeToggle = true }) {
  const { theme } = useTheme();
  
  // Provide default theme during SSR/initial render
  const currentTheme = theme || 'dark';
  const isDark = currentTheme === 'dark';

  return (
    <>
      {showThemeToggle && <ThemeToggle />}
      
      <div className={`relative transition-colors duration-700 min-h-screen
        ${isDark
          ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-ink-black'
        }`}>
        {children}
      </div>
    </>
  );
}