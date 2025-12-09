'use client';

import { useEffect, useState } from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Optimized background component for mobile performance
 * Uses CSS background for better performance than Next Image
 * Applies smart optimizations based on device type
 */
export default function OptimizedBackground() {
  const { isMobile } = useDeviceDetection();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  const isDark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 pointer-events-none transition-all duration-700"
      style={{
        zIndex: 0,
        backgroundImage: 'url(/assets/9-1-1536x720.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: isMobile ? 'scroll' : 'fixed',
        opacity: isDark ? 0.08 : 0.35,
        mixBlendMode: isDark ? 'screen' : 'multiply',
        filter: isMobile
          ? 'brightness(0.7)'
          : isDark
            ? 'brightness(0.6) contrast(0.8) saturate(0.2) blur(1.5px)'
            : 'brightness(0.9) contrast(1.1)',
      }}
    />
  );
}