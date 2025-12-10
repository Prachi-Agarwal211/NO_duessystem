/**
 * Performance-Optimized Shadow and Gradient System
 * Layered shadows for depth without performance impact
 */

// ============== SHADOW SYSTEM ==============

/**
 * Elevation-based shadow system (inspired by Material Design)
 * Uses multiple layers for realistic depth
 */
export const shadows = {
  // No shadow
  none: 'none',
  
  // Subtle shadows for cards and containers
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  // Colored shadows for emphasis
  red: {
    sm: '0 2px 8px rgba(220, 38, 38, 0.15)',
    md: '0 4px 12px rgba(220, 38, 38, 0.2)',
    lg: '0 8px 20px rgba(220, 38, 38, 0.25)',
    glow: '0 0 20px rgba(220, 38, 38, 0.4)'
  },
  
  blue: {
    sm: '0 2px 8px rgba(59, 130, 246, 0.15)',
    md: '0 4px 12px rgba(59, 130, 246, 0.2)',
    lg: '0 8px 20px rgba(59, 130, 246, 0.25)',
    glow: '0 0 20px rgba(59, 130, 246, 0.4)'
  },
  
  green: {
    sm: '0 2px 8px rgba(34, 197, 94, 0.15)',
    md: '0 4px 12px rgba(34, 197, 94, 0.2)',
    lg: '0 8px 20px rgba(34, 197, 94, 0.25)',
    glow: '0 0 20px rgba(34, 197, 94, 0.4)'
  },
  
  // Inner shadows for depth
  inner: {
    sm: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    md: 'inset 0 2px 6px 0 rgba(0, 0, 0, 0.1)',
    lg: 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.15)'
  },
  
  // Neon effect (for dark mode)
  neon: {
    red: '0 0 10px rgba(220, 38, 38, 0.5), 0 0 20px rgba(220, 38, 38, 0.3)',
    blue: '0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)',
    green: '0 0 10px rgba(34, 197, 94, 0.5), 0 0 20px rgba(34, 197, 94, 0.3)',
    white: '0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.2)'
  }
};

/**
 * Generate shadow utility classes
 */
export const getShadowClass = (level, theme = 'light') => {
  const shadowMap = {
    xs: theme === 'dark' ? 'shadow-xs dark:shadow-white/5' : 'shadow-xs',
    sm: theme === 'dark' ? 'shadow-sm dark:shadow-white/10' : 'shadow-sm',
    md: theme === 'dark' ? 'shadow-md dark:shadow-white/10' : 'shadow-md',
    lg: theme === 'dark' ? 'shadow-lg dark:shadow-white/10' : 'shadow-lg',
    xl: theme === 'dark' ? 'shadow-xl dark:shadow-white/10' : 'shadow-xl',
    '2xl': theme === 'dark' ? 'shadow-2xl dark:shadow-white/20' : 'shadow-2xl'
  };
  
  return shadowMap[level] || shadowMap.sm;
};

// ============== GRADIENT SYSTEM ==============

/**
 * Modern gradient presets
 */
export const gradients = {
  // Solid to transparent overlays
  overlays: {
    dark: {
      top: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
      bottom: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
      left: 'linear-gradient(to right, rgba(0,0,0,0.8) 0%, transparent 100%)',
      right: 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, transparent 100%)'
    },
    light: {
      top: 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, transparent 100%)',
      bottom: 'linear-gradient(to top, rgba(255,255,255,0.9) 0%, transparent 100%)',
      left: 'linear-gradient(to right, rgba(255,255,255,0.9) 0%, transparent 100%)',
      right: 'linear-gradient(to left, rgba(255,255,255,0.9) 0%, transparent 100%)'
    }
  },
  
  // Brand gradients
  brand: {
    primary: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
    primarySoft: 'linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(153, 27, 27, 0.8) 100%)',
    accent: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
  },
  
  // Colorful gradients
  vibrant: {
    sunset: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)',
    ocean: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fire: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    forest: 'linear-gradient(135deg, #FA8BFF 0%, #2BD2FF 90%, #2BFF88 100%)',
    aurora: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    cosmic: 'linear-gradient(135deg, #667eea 0%, #f093fb 50%, #feca57 100%)'
  },
  
  // Subtle gradients for backgrounds
  subtle: {
    gray: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    warm: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    cool: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    neutral: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)'
  },
  
  // Glass morphism backgrounds
  glass: {
    light: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.3) 100%)',
    dark: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.3) 100%)',
    colorful: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)'
  },
  
  // Shimmer effect for loading states
  shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
  shimmerDark: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)'
};

/**
 * Generate gradient utility function
 */
export const getGradient = (type, variant, theme = 'light') => {
  if (type === 'overlay') {
    return gradients.overlays[theme][variant] || gradients.overlays[theme].top;
  }
  
  return gradients[type]?.[variant] || gradients.brand.primary;
};

// ============== GLASSMORPHISM STYLES ==============

/**
 * Modern glassmorphism effect
 */
export const glassmorphism = {
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: shadows.lg
  },
  dark: {
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: shadows.neon.white
  },
  colorful: {
    background: 'rgba(220, 38, 38, 0.1)',
    backdropFilter: 'blur(10px) saturate(200%)',
    border: '1px solid rgba(220, 38, 38, 0.2)',
    boxShadow: shadows.red.sm
  }
};

/**
 * Apply glassmorphism to element
 */
export const getGlassmorphismStyle = (variant = 'light') => {
  return glassmorphism[variant] || glassmorphism.light;
};

// ============== UTILITY FUNCTIONS ==============

/**
 * Generate CSS string for inline styles
 */
export const toCSSString = (styleObject) => {
  return Object.entries(styleObject)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value}`;
    })
    .join('; ');
};

/**
 * Combine multiple shadow values
 */
export const combineShadows = (...shadowValues) => {
  return shadowValues.filter(Boolean).join(', ');
};

/**
 * Create animated gradient background
 */
export const animatedGradient = (colors = ['#DC2626', '#991B1B']) => {
  return {
    background: `linear-gradient(-45deg, ${colors.join(', ')})`,
    backgroundSize: '400% 400%',
    animation: 'gradient 15s ease infinite'
  };
};

// ============== THEME-AWARE UTILITIES ==============

/**
 * Get theme-aware styles
 */
export const getThemedStyles = (theme = 'light') => ({
  card: {
    background: theme === 'dark' 
      ? 'rgba(0, 0, 0, 0.8)' 
      : 'rgba(255, 255, 255, 0.9)',
    border: theme === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.1)'
      : '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: theme === 'dark'
      ? shadows.neon.white
      : shadows.md
  },
  button: {
    primary: {
      background: theme === 'dark'
        ? gradients.brand.primary
        : gradients.brand.primary,
      boxShadow: theme === 'dark'
        ? shadows.neon.red
        : shadows.red.md,
      hover: {
        boxShadow: theme === 'dark'
          ? shadows.neon.red
          : shadows.red.lg
      }
    },
    secondary: {
      background: theme === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.05)',
      border: theme === 'dark'
        ? '1px solid rgba(255, 255, 255, 0.2)'
        : '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: shadows.sm
    }
  },
  input: {
    background: theme === 'dark'
      ? 'rgba(0, 0, 0, 0.5)'
      : 'rgba(255, 255, 255, 0.9)',
    border: theme === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.2)'
      : '1px solid rgba(0, 0, 0, 0.2)',
    focus: {
      border: theme === 'dark'
        ? '1px solid rgba(220, 38, 38, 0.8)'
        : '1px solid rgba(220, 38, 38, 1)',
      boxShadow: theme === 'dark'
        ? shadows.neon.red
        : shadows.red.md
    }
  }
});

// Export all styles
export default {
  shadows,
  gradients,
  glassmorphism,
  getShadowClass,
  getGradient,
  getGlassmorphismStyle,
  toCSSString,
  combineShadows,
  animatedGradient,
  getThemedStyles
};