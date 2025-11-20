'use client';

import Background from './Background';
import CustomCursor from './CustomCursor';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

export default function PageWrapper({ children, showThemeToggle = true }) {
  const { theme } = useTheme();

  return (
    <div className={`relative min-h-screen w-full transition-colors duration-700 ease-smooth overflow-hidden
      ${theme === 'dark' ? 'bg-deep-black text-white' : 'bg-white text-ink-black'}`}>
      
      <Background theme={theme} />
      <CustomCursor theme={theme} />
      {showThemeToggle && <ThemeToggle />}
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}