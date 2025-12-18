'use client';

import ThemeToggle from './ThemeToggle';
import GlobalBackground from '@/components/ui/GlobalBackground';
import { useTheme } from '@/contexts/ThemeContext';

export default function PageWrapper({ children, showThemeToggle = true }) {
  const { theme } = useTheme();
  
  // Provide default theme during SSR/initial render
  const currentTheme = theme || 'dark';
  const isDark = currentTheme === 'dark';

  return (
    <>
      {showThemeToggle && <ThemeToggle />}
      
      {/* Global Background with campus image, animated gradients, and grid */}
      <GlobalBackground />
      
      <div className={`relative transition-colors duration-700 min-h-screen
        ${isDark ? 'text-white' : 'text-ink-black'
        }`}>
        {children}
      </div>
    </>
  );
}