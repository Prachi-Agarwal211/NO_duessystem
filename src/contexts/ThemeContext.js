'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Start with null to prevent hydration mismatch; we'll sync with system/theme after mount
  const [theme, setTheme] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // SSR guard - only access localStorage in browser
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setTheme(savedTheme);
      // Apply data-theme attributes for unified theming
      document.documentElement.setAttribute('data-theme', savedTheme);
      document.body.setAttribute('data-theme', savedTheme);
      // Maintain legacy .dark class for backward compatibility
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      document.body.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    // SSR guard
    if (typeof window === 'undefined') return;
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.body.classList.toggle('dark', newTheme === 'dark');
  };

  // Render with default theme until mounted (prevents hydration mismatch)
  // Provide a safe default until hydration completes
  if (!mounted || !theme) {
    return (
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}>
        <div data-theme="light">{children}</div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
