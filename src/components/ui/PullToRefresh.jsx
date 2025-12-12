'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

/**
 * PullToRefresh Component
 * 
 * Enables pull-to-refresh gesture on mobile devices.
 * Features:
 * - Touch-based pull gesture
 * - Visual feedback during pull
 * - Automatic refresh trigger
 * - Smooth spring animations
 * - Custom refresh callback
 * - Configurable threshold
 * - Works on mobile and desktop
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Content to wrap
 * @param {Function} props.onRefresh - Async callback when refresh is triggered
 * @param {number} props.threshold - Pull distance to trigger refresh (default: 80)
 * @param {boolean} props.disabled - Disable pull-to-refresh
 * @param {string} props.className - Additional CSS classes
 */
export default function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  disabled = false,
  className = ''
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(true);
  const containerRef = useRef(null);
  const y = useMotionValue(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  
  // Transform pull distance to rotation for refresh icon
  const rotate = useTransform(y, [0, threshold], [0, 180]);
  const opacity = useTransform(y, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const scale = useTransform(y, [0, threshold], [0.5, 1]);
  
  // Check if at top of scroll
  const checkCanPull = () => {
    if (typeof window === 'undefined') return false;
    return window.scrollY === 0;
  };
  
  // Handle touch start
  const handleTouchStart = (e) => {
    if (disabled || isRefreshing || !checkCanPull()) {
      setCanPull(false);
      return;
    }
    
    setCanPull(true);
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };
  
  // Handle touch move
  const handleTouchMove = (e) => {
    if (!isDragging.current || !canPull || disabled || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;
    
    // Only allow pulling down
    if (deltaY > 0) {
      // Prevent default scroll when pulling
      e.preventDefault();
      
      // Apply resistance curve (harder to pull as distance increases)
      const resistance = 0.5;
      const adjustedDelta = Math.pow(deltaY, resistance);
      y.set(Math.min(adjustedDelta, threshold * 1.5));
    }
  };
  
  // Handle touch end
  const handleTouchEnd = async () => {
    if (!isDragging.current || !canPull) {
      isDragging.current = false;
      return;
    }
    
    isDragging.current = false;
    const currentY = y.get();
    
    // Trigger refresh if pulled past threshold
    if (currentY >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      // Animate to loading position
      await animate(y, threshold, {
        type: 'spring',
        stiffness: 300,
        damping: 30
      });
      
      try {
        // Execute refresh callback
        if (onRefresh) {
          await onRefresh();
        }
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        // Animate back to top
        await animate(y, 0, {
          type: 'spring',
          stiffness: 300,
          damping: 30
        });
        setIsRefreshing(false);
      }
    } else {
      // Snap back if threshold not reached
      animate(y, 0, {
        type: 'spring',
        stiffness: 300,
        damping: 30
      });
    }
  };
  
  // Add mouse support for desktop testing
  const handleMouseDown = (e) => {
    if (disabled || isRefreshing || !checkCanPull()) {
      setCanPull(false);
      return;
    }
    
    setCanPull(true);
    startY.current = e.clientY;
    isDragging.current = true;
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging.current || !canPull || disabled || isRefreshing) return;
    
    const currentY = e.clientY;
    const deltaY = currentY - startY.current;
    
    if (deltaY > 0) {
      const resistance = 0.5;
      const adjustedDelta = Math.pow(deltaY, resistance);
      y.set(Math.min(adjustedDelta, threshold * 1.5));
    }
  };
  
  const handleMouseUp = () => {
    handleTouchEnd();
  };
  
  // Cleanup
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setCanPull(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Pull indicator */}
      <motion.div
        style={{ y }}
        className="relative"
      >
        {/* Refresh icon container */}
        <motion.div
          style={{ opacity }}
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full pb-4 pointer-events-none"
        >
          <motion.div
            style={{ rotate, scale }}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isRefreshing
                ? 'bg-jecrc-red text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </motion.div>
          
          {/* Pull text */}
          <motion.p
            style={{ opacity }}
            className="text-xs text-center mt-2 text-gray-600 dark:text-gray-400"
          >
            {isRefreshing ? 'Refreshing...' : y.get() >= threshold ? 'Release to refresh' : 'Pull to refresh'}
          </motion.p>
        </motion.div>
        
        {/* Content */}
        {children}
      </motion.div>
    </div>
  );
}

/**
 * usePullToRefresh Hook
 * 
 * Headless hook for implementing custom pull-to-refresh UI.
 * Provides all the logic without any UI components.
 * 
 * @param {Function} onRefresh - Callback when refresh is triggered
 * @param {Object} options - Configuration options
 * @returns {Object} Pull-to-refresh state and handlers
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const {
    threshold = 80,
    disabled = false,
    resistance = 0.5
  } = options;
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  
  const handleStart = (clientY) => {
    if (disabled || isRefreshing || window.scrollY > 0) return false;
    startY.current = clientY;
    isDragging.current = true;
    return true;
  };
  
  const handleMove = (clientY) => {
    if (!isDragging.current || disabled || isRefreshing) return;
    
    const deltaY = clientY - startY.current;
    if (deltaY > 0) {
      const adjustedDelta = Math.pow(deltaY, resistance);
      setPullDistance(Math.min(adjustedDelta, threshold * 1.5));
    }
  };
  
  const handleEnd = async () => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        if (onRefresh) await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };
  
  return {
    isRefreshing,
    pullDistance,
    shouldShowIndicator: pullDistance > 0,
    progress: Math.min(pullDistance / threshold, 1),
    handlers: {
      onTouchStart: (e) => handleStart(e.touches[0].clientY),
      onTouchMove: (e) => handleMove(e.touches[0].clientY),
      onTouchEnd: handleEnd,
      onMouseDown: (e) => handleStart(e.clientY),
      onMouseMove: (e) => handleMove(e.clientY),
      onMouseUp: handleEnd,
      onMouseLeave: handleEnd
    }
  };
}