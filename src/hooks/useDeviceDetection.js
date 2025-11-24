'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to detect device capabilities and characteristics
 * Prevents redundant device detection code across components
 * 
 * @returns {Object} Device detection state
 * @property {boolean} isMobile - True if device has touch capability or coarse pointer
 * @property {boolean} isTablet - True if device is tablet-sized (768px - 1024px)
 * @property {boolean} isDesktop - True if device is desktop-sized (>1024px)
 * @property {boolean} hasTouch - True if device supports touch events
 * @property {boolean} hasHover - True if device supports hover interactions
 * @property {number} width - Current viewport width
 * @property {number} height - Current viewport height
 */
export function useDeviceDetection() {
  const [deviceState, setDeviceState] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
    hasHover: true,
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    const detectDevice = () => {
      // Touch capability detection
      const hasTouch = 
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        navigator.msMaxTouchPoints > 0;

      // Pointer precision detection
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
      
      // Hover capability detection
      const hasHover = window.matchMedia('(hover: hover)').matches;

      // Screen size detection
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Device type classification
      const isMobile = hasTouch || hasCoarsePointer || width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024 && hasFinePointer;

      setDeviceState({
        isMobile,
        isTablet,
        isDesktop,
        hasTouch,
        hasHover,
        width,
        height,
      });
    };

    // Initial detection
    detectDevice();

    // Update on resize with debouncing
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(detectDevice, 150);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', detectDevice);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  return deviceState;
}

/**
 * Optimized particle count calculator for canvas animations
 * Reduces particle density on mobile devices for better performance
 * 
 * @param {number} width - Viewport width
 * @param {boolean} isMobile - Is mobile device
 * @returns {number} Optimal particle count
 */
export function calculateOptimalParticleCount(width, isMobile) {
  const baseRatio = isMobile ? 0.03 : 0.06; // 50% reduction on mobile
  return Math.floor(width * baseRatio);
}

/**
 * Check if device should use reduced motion
 * Respects user's accessibility preferences
 * 
 * @returns {boolean} True if reduced motion is preferred
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}