'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

/**
 * AnimatedCounter Component
 * 
 * Animates numbers counting up from 0 to target value with easing.
 * Features:
 * - Smooth counting animation with custom easing
 * - Configurable duration and delay
 * - Respects prefers-reduced-motion
 * - GPU-accelerated rendering
 * - Supports decimal values
 * - Optional prefix/suffix (e.g., "$", "%", "K", "M")
 * 
 * @param {Object} props
 * @param {number} props.value - Target value to count to
 * @param {number} props.duration - Animation duration in seconds (default: 2)
 * @param {number} props.delay - Delay before starting animation in seconds (default: 0)
 * @param {number} props.decimals - Number of decimal places (default: 0)
 * @param {string} props.prefix - Text before number (e.g., "$")
 * @param {string} props.suffix - Text after number (e.g., "%", "K")
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.formatter - Custom number formatter function
 */
export default function AnimatedCounter({
  value = 0,
  duration = 2,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  formatter = null
}) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const counterRef = useRef(null);
  
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;
  
  // Spring animation for smooth counting
  const spring = useSpring(0, {
    duration: prefersReducedMotion ? 0 : duration * 1000,
    bounce: 0,
    delay: prefersReducedMotion ? 0 : delay * 1000
  });
  
  // Transform spring value to display value
  const display = useTransform(spring, (latest) => {
    if (formatter) {
      return formatter(latest);
    }
    return latest.toFixed(decimals);
  });
  
  // Intersection Observer to trigger animation when in viewport
  useEffect(() => {
    if (!counterRef.current || hasAnimated) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            // Start counting animation
            spring.set(value);
            setHasAnimated(true);
          }
        });
      },
      { threshold: 0.1 } // Trigger when 10% visible
    );
    
    observer.observe(counterRef.current);
    
    return () => {
      if (counterRef.current) {
        observer.unobserve(counterRef.current);
      }
    };
  }, [spring, value, hasAnimated]);
  
  // Update when value changes
  useEffect(() => {
    if (hasAnimated) {
      spring.set(value);
    }
  }, [value, spring, hasAnimated]);
  
  return (
    <span ref={counterRef} className={className}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

/**
 * useCountUp Hook
 * 
 * Custom hook for manual control of counting animation.
 * Useful when you need more control over the animation lifecycle.
 * 
 * Usage:
 * ```jsx
 * const { count, startCounting, resetCount } = useCountUp(100, { duration: 2 });
 * 
 * return (
 *   <div>
 *     <span>{count}</span>
 *     <button onClick={startCounting}>Count Up</button>
 *   </div>
 * );
 * ```
 */
export function useCountUp(targetValue, options = {}) {
  const {
    duration = 2,
    decimals = 0,
    onComplete = null,
    autoStart = false
  } = options;
  
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef();
  const startTimeRef = useRef();
  
  const easeOutExpo = (t) => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  };
  
  const animate = (timestamp) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }
    
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / (duration * 1000), 1);
    const easedProgress = easeOutExpo(progress);
    
    const currentCount = easedProgress * targetValue;
    setCount(parseFloat(currentCount.toFixed(decimals)));
    
    if (progress < 1) {
      frameRef.current = requestAnimationFrame(animate);
    } else {
      setIsAnimating(false);
      if (onComplete) onComplete();
    }
  };
  
  const startCounting = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    startTimeRef.current = null;
    frameRef.current = requestAnimationFrame(animate);
  };
  
  const resetCount = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    setCount(0);
    setIsAnimating(false);
    startTimeRef.current = null;
  };
  
  useEffect(() => {
    if (autoStart) {
      startCounting();
    }
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [autoStart]);
  
  return {
    count,
    isAnimating,
    startCounting,
    resetCount
  };
}

/**
 * formatNumber - Helper function to format large numbers
 * 
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted number with K/M/B suffix
 * 
 * Examples:
 * formatNumber(1234) => "1.2K"
 * formatNumber(1234567) => "1.2M"
 * formatNumber(1234567890) => "1.2B"
 */
export function formatNumber(num, decimals = 1) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(decimals) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(decimals) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(decimals) + 'K';
  }
  return num.toString();
}

/**
 * formatCurrency - Helper function to format currency
 * 
 * @param {number} num - Number to format
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string} Formatted currency
 * 
 * Examples:
 * formatCurrency(1234.56) => "$1,234.56"
 */
export function formatCurrency(num, currency = '$') {
  return currency + num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * formatPercentage - Helper function to format percentage
 * 
 * @param {number} num - Number to format (0-100)
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string} Formatted percentage
 * 
 * Examples:
 * formatPercentage(45.67) => "45.7%"
 */
export function formatPercentage(num, decimals = 1) {
  return num.toFixed(decimals) + '%';
}