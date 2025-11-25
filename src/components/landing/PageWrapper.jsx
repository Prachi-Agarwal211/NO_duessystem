'use client';

import Background from './Background';
import CustomCursor from './CustomCursor';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

export default function PageWrapper({ children, showThemeToggle = true }) {
  const { theme } = useTheme();
  
  // Provide default theme during SSR/initial render
  const currentTheme = theme || 'dark';
  const isDark = currentTheme === 'dark';

  return (
    <div className="relative min-h-screen w-full transition-colors duration-700 ease-smooth overflow-hidden">
      
      <Background theme={currentTheme} />
      <CustomCursor theme={currentTheme} />
      {showThemeToggle && <ThemeToggle />}
      
      <div className={`relative z-10 transition-colors duration-700
        ${isDark ? 'text-white' : 'text-ink-black'}`}>
        {children}
      </div>
    </div>
  );
}