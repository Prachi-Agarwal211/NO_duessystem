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
        ${isDark ? 'text-white' : 'text-ink-black'}`}>
        {children}
      </div>
    </>
  );
}