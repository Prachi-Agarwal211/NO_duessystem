'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ScrollProgress - Thin progress bar showing page scroll progress
 * Appears at the top of the page, inspired by Medium.com
 * Performance optimized with spring physics
 */
export default function ScrollProgress() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Track scroll progress (0 to 1)
  const { scrollYProgress } = useScroll();
  
  // Apply spring physics for smooth animation
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] origin-left z-[9999] pointer-events-none"
      style={{
        scaleX,
        background: isDark
          ? 'linear-gradient(90deg, #C41E3A 0%, #FF3366 50%, #C41E3A 100%)'
          : 'linear-gradient(90deg, #8B0000 0%, #C41E3A 50%, #8B0000 100%)',
        boxShadow: isDark
          ? '0 0 10px rgba(196, 30, 58, 0.6), 0 0 20px rgba(255, 51, 102, 0.3)'
          : '0 0 8px rgba(196, 30, 58, 0.4)',
        transformOrigin: '0%',
      }}
    />
  );
}