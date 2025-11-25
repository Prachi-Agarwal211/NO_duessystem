'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Start with null to prevent hydration mismatch
  const [theme, setTheme] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // SSR guard - only access localStorage in browser
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      setTheme(savedTheme);
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
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.body.classList.toggle('dark', newTheme === 'dark');
  };

  // Render with default theme until mounted (prevents hydration mismatch)
  if (!mounted || !theme) {
    return (
      <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: () => {} }}>
        <div className="dark">{children}</div>
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