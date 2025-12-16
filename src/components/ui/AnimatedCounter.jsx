'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedCounter - Smoothly animates number changes
 * Used in StatsCard to create engaging count-up animations
 */
export default function AnimatedCounter({ 
  value, 
  duration = 1000, 
  className = "" 
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const animationRef = useRef(null);

  useEffect(() => {
    // Only animate if value actually changed
    if (prevValueRef.current === value) return;

    setIsAnimating(true);
    const startValue = displayValue;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function for smooth animation (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeProgress);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
        prevValueRef.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, displayValue]);

  // Format number with commas for thousands
  const formattedValue = displayValue.toLocaleString('en-IN');

  return (
    <span className={`tabular-nums ${isAnimating ? 'animate-pulse' : ''} ${className}`}>
      {formattedValue}
    </span>
  );
}