'use client';

import { ReactLenis } from '@studio-freight/react-lenis';

/**
 * SmoothScroll - Wraps the app with Lenis smooth scrolling
 * Provides buttery smooth inertia scrolling like Apple websites
 */
export default function SmoothScroll({ children }) {
  return (
    <ReactLenis 
      root 
      options={{ 
        lerp: 0.1,           // Smoothness (0.1 = very smooth)
        duration: 1.2,       // Scroll duration
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}