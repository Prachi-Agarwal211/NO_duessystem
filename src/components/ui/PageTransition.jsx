'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * PageTransition Component
 * 
 * Wraps page content with smooth fade/slide transitions during route changes.
 * Features:
 * - Multiple transition types
 * - Configurable duration and easing
 * - GPU-accelerated animations
 * - Respects prefers-reduced-motion
 * - Works with Next.js App Router
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Page content to animate
 * @param {string} props.type - Transition type: 'fade', 'slide', 'scale', 'blur' (default: 'fade')
 * @param {number} props.duration - Animation duration in seconds (default: 0.3)
 * @param {string} props.className - Additional CSS classes
 */
export default function PageTransition({
  children,
  type = 'fade',
  duration = 0.3,
  className = ''
}) {
  const pathname = usePathname();
  
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  
  // Transition variants
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slide: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 }
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 }
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.05 }
    },
    blur: {
      initial: { opacity: 0, filter: 'blur(10px)' },
      animate: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(10px)' }
    }
  };
  
  const selectedVariant = variants[type] || variants.fade;
  
  // If user prefers reduced motion, use simple fade
  const finalVariant = prefersReducedMotion ? variants.fade : selectedVariant;
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={finalVariant}
        transition={{
          duration: prefersReducedMotion ? 0.15 : duration,
          ease: [0.22, 1, 0.36, 1] // Custom easing for smooth feel
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * LoadingTransition Component
 * 
 * Shows a loading state during page transitions.
 * Displays progress bar or spinner while content loads.
 * 
 * @param {Object} props
 * @param {boolean} props.loading - Whether page is loading
 * @param {string} props.type - Loading indicator type: 'bar', 'spinner', 'pulse'
 * @param {string} props.color - Loading indicator color (Tailwind class)
 */
export function LoadingTransition({
  loading = false,
  type = 'bar',
  color = 'bg-jecrc-red'
}) {
  if (!loading) return null;
  
  if (type === 'bar') {
    return (
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        exit={{ scaleX: 0 }}
        transition={{ duration: 0.3 }}
        className={`fixed top-0 left-0 right-0 h-1 ${color} origin-left z-50`}
        style={{ transformOrigin: 'left' }}
      />
    );
  }
  
  if (type === 'spinner') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <div className={`w-12 h-12 border-4 border-gray-200 border-t-${color.replace('bg-', '')} rounded-full animate-spin`} />
      </motion.div>
    );
  }
  
  if (type === 'pulse') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className={`fixed top-4 right-4 w-3 h-3 ${color} rounded-full z-50`}
      />
    );
  }
  
  return null;
}

/**
 * StaggeredPageTransition Component
 * 
 * Page transition with staggered children animation.
 * Each child element animates in sequence.
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Page content (will be wrapped)
 * @param {number} props.stagger - Delay between children in seconds (default: 0.1)
 * @param {number} props.duration - Animation duration per child (default: 0.3)
 */
export function StaggeredPageTransition({
  children,
  stagger = 0.1,
  duration = 0.3
}) {
  const pathname = usePathname();
  
  // Convert children to array
  const childrenArray = React.Children.toArray(children);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname}>
        {childrenArray.map((child, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration,
              delay: index * stagger,
              ease: [0.22, 1, 0.36, 1]
            }}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * RouteChangeProgress Component
 * 
 * Global progress bar that shows during route changes.
 * Automatically detects route changes in Next.js.
 * 
 * Usage in layout.js:
 * ```jsx
 * import { RouteChangeProgress } from '@/components/ui/PageTransition';
 * 
 * export default function Layout({ children }) {
 *   return (
 *     <>
 *       <RouteChangeProgress />
 *       {children}
 *     </>
 *   );
 * }
 * ```
 */
export function RouteChangeProgress({ color = 'bg-jecrc-red' }) {
  const [loading, setLoading] = React.useState(false);
  const pathname = usePathname();
  const prevPathname = React.useRef(pathname);
  
  React.useEffect(() => {
    if (pathname !== prevPathname.current) {
      setLoading(true);
      prevPathname.current = pathname;
      
      // Simulate loading complete after a short delay
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [pathname]);
  
  return <LoadingTransition loading={loading} type="bar" color={color} />;
}

/**
 * FadeInView Component
 * 
 * Wrapper that fades in children when they scroll into view.
 * Perfect for sections that should animate on scroll.
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Content to animate
 * @param {number} props.delay - Animation delay in seconds (default: 0)
 * @param {number} props.duration - Animation duration (default: 0.6)
 * @param {number} props.threshold - Intersection threshold 0-1 (default: 0.1)
 */
export function FadeInView({
  children,
  delay = 0,
  duration = 0.6,
  threshold = 0.1
}) {
  const ref = React.useRef(null);
  const [isVisible, setIsVisible] = React.useState(false);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      {children}
    </motion.div>
  );
}