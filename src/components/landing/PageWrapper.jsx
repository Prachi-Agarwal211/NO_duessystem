'use client';

import AuroraBackground from '@/components/ui/AuroraBackground';
import CustomCursor from './CustomCursor';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

export default function PageWrapper({ children, showThemeToggle = true }) {
  const { theme } = useTheme();
  
  // Provide default theme during SSR/initial render
  const currentTheme = theme || 'dark';
  const isDark = currentTheme === 'dark';

  return (
    <AuroraBackground>
      <CustomCursor theme={currentTheme} />
      {showThemeToggle && <ThemeToggle />}
      
      <div className={`relative z-10 transition-colors duration-700 min-h-screen
        ${isDark ? 'text-white' : 'text-ink-black'}`}>
        {children}
      </div>
    </AuroraBackground>
  );
}