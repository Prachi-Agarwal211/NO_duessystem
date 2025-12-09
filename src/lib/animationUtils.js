/**
 * Performance-Optimized Animation Utilities
 * Hardware-accelerated animations using transform and opacity
 */

// Animation variants for Framer Motion
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: {
    type: "spring",
    stiffness: 300,
    damping: 30
  }
};

export const slideDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: {
    type: "spring",
    stiffness: 300,
    damping: 30
  }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 25
  }
};

export const slideLeft = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: {
    type: "spring",
    stiffness: 300,
    damping: 30
  }
};

// Staggered children animation
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

// Dropdown-specific animations
export const dropdownAnimation = {
  initial: { opacity: 0, y: -10, scale: 0.98 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
      mass: 0.5
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    scale: 0.98,
    transition: { duration: 0.15 }
  }
};

// Hover animations (use with whileHover)
export const hoverLift = {
  y: -2,
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 17
  }
};

export const hoverScale = {
  scale: 1.02,
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 17
  }
};

export const hoverGlow = {
  boxShadow: "0 0 20px rgba(220, 38, 38, 0.3)",
  transition: { duration: 0.2 }
};

// Tap animations (use with whileTap)
export const tapScale = {
  scale: 0.98,
  transition: { duration: 0.1 }
};

// Loading animations
export const pulseAnimation = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export const spinAnimation = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// Page transition variants
export const pageTransition = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

// Modal animations
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: { duration: 0.2 }
  }
};

// Error shake animation
export const shakeAnimation = {
  x: [0, -10, 10, -10, 10, 0],
  transition: { duration: 0.4 }
};

// Success bounce animation
export const bounceAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 0.5,
    ease: "easeInOut"
  }
};

/**
 * Create staggered list animation
 * @param {number} itemCount - Number of items to animate
 * @param {number} staggerDelay - Delay between each item (default: 0.05)
 */
export const createStaggerAnimation = (itemCount, staggerDelay = 0.05) => ({
  container: {
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  }
});

/**
 * Conditional animation based on device performance
 * Uses reduced motion preference and device capabilities
 */
export const getOptimizedAnimation = (animation) => {
  if (typeof window === 'undefined') return animation;
  
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    // Return simplified animation
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.15 }
    };
  }
  
  return animation;
};

/**
 * Performance monitoring for animations
 */
export const monitorAnimationPerformance = () => {
  if (typeof window === 'undefined' || !window.performance) return;
  
  let frameCount = 0;
  let lastTime = performance.now();
  
  const measureFPS = () => {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= lastTime + 1000) {
      const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      
      if (fps < 55) {
        console.warn(`[Performance] Low FPS detected: ${fps}`);
      }
      
      frameCount = 0;
      lastTime = currentTime;
    }
    
    requestAnimationFrame(measureFPS);
  };
  
  if (process.env.NODE_ENV === 'development') {
    requestAnimationFrame(measureFPS);
  }
};

// Export all as default for easy importing
export default {
  fadeIn,
  slideUp,
  slideDown,
  scaleIn,
  slideLeft,
  staggerContainer,
  dropdownAnimation,
  hoverLift,
  hoverScale,
  hoverGlow,
  tapScale,
  pulseAnimation,
  spinAnimation,
  pageTransition,
  modalBackdrop,
  modalContent,
  shakeAnimation,
  bounceAnimation,
  createStaggerAnimation,
  getOptimizedAnimation,
  monitorAnimationPerformance
};