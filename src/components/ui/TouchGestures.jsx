'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

/**
 * TouchGestures Component
 * 
 * Enhanced touch interactions for mobile devices.
 * Features:
 * - Tap, double-tap, long-press detection
 * - Pinch zoom gesture
 * - Haptic feedback (vibration)
 * - Touch target optimization (min 44x44px)
 * - Visual feedback on touch
 * - Gesture conflict prevention
 */

/**
 * useTouchGestures Hook
 * 
 * Comprehensive touch gesture detection.
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} Gesture handlers and state
 */
export function useTouchGestures(options = {}) {
  const {
    onTap = () => {},
    onDoubleTap = () => {},
    onLongPress = () => {},
    onSwipeLeft = () => {},
    onSwipeRight = () => {},
    onSwipeUp = () => {},
    onSwipeDown = () => {},
    onPinch = () => {},
    longPressDuration = 500,
    doubleTapDelay = 300,
    swipeThreshold = 50,
    hapticFeedback = true
  } = options;
  
  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const lastTap = useRef(0);
  const longPressTimer = useRef(null);
  const initialDistance = useRef(0);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  
  // Trigger haptic feedback
  const vibrate = useCallback((pattern = 10) => {
    if (hapticFeedback && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, [hapticFeedback]);
  
  // Calculate distance between two touches
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Handle touch start
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    // Multi-touch for pinch
    if (e.touches.length === 2) {
      setIsPinching(true);
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
      return;
    }
    
    // Long press detection
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      vibrate(50); // Longer vibration for long press
      onLongPress(e);
    }, longPressDuration);
  };
  
  // Handle touch move
  const handleTouchMove = (e) => {
    // Clear long press if moved
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // Pinch zoom
    if (isPinching && e.touches.length === 2) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistance.current;
      onPinch({ scale, distance: currentDistance });
    }
  };
  
  // Handle touch end
  const handleTouchEnd = (e) => {
    setIsLongPressing(false);
    setIsPinching(false);
    
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;
    
    // Check for swipe
    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      vibrate(10);
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipeRight({ deltaX, deltaY, deltaTime });
        } else {
          onSwipeLeft({ deltaX, deltaY, deltaTime });
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipeDown({ deltaX, deltaY, deltaTime });
        } else {
          onSwipeUp({ deltaX, deltaY, deltaTime });
        }
      }
      return;
    }
    
    // Check for tap (not swipe, not long press)
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < longPressDuration) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTap.current;
      
      if (timeSinceLastTap < doubleTapDelay) {
        // Double tap
        vibrate([10, 50, 10]); // Double vibration
        onDoubleTap(e);
        lastTap.current = 0; // Reset
      } else {
        // Single tap
        vibrate(10);
        onTap(e);
        lastTap.current = now;
      }
    }
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);
  
  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    state: {
      isLongPressing,
      isPinching
    }
  };
}

/**
 * TouchTarget Component
 * 
 * Ensures minimum touch target size (44x44px) for accessibility.
 */
export function TouchTarget({ children, className = '', minSize = 44, ...props }) {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ minWidth: minSize, minHeight: minSize }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * TapFeedback Component
 * 
 * Visual feedback on tap with ripple effect.
 */
export function TapFeedback({ children, className = '', haptic = true, ...props }) {
  const [ripples, setRipples] = useState([]);
  
  const handleTap = (e) => {
    // Haptic feedback
    if (haptic && navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    // Create ripple
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    
    const newRipple = {
      id: Date.now(),
      x,
      y
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
    
    // Call original handler if provided
    if (props.onTouchStart) {
      props.onTouchStart(e);
    }
  };
  
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onTouchStart={handleTap}
      {...props}
    >
      {children}
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="absolute rounded-full bg-blue-400/30 pointer-events-none"
          initial={{
            width: 0,
            height: 0,
            x: ripple.x,
            y: ripple.y,
            opacity: 1
          }}
          animate={{
            width: 200,
            height: 200,
            x: ripple.x - 100,
            y: ripple.y - 100,
            opacity: 0
          }}
          transition={{ duration: 0.6 }}
        />
      ))}
    </div>
  );
}

/**
 * LongPressButton Component
 * 
 * Button that triggers on long press with progress indicator.
 */
export function LongPressButton({
  children,
  onComplete = () => {},
  duration = 1000,
  className = '',
  ...props
}) {
  const [progress, setProgress] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  
  const handleStart = () => {
    setIsPressed(true);
    startTimeRef.current = Date.now();
    
    // Haptic feedback on start
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    // Update progress
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        handleComplete();
      }
    }, 16); // ~60fps
  };
  
  const handleComplete = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Haptic feedback on complete
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    onComplete();
    reset();
  };
  
  const reset = () => {
    setIsPressed(false);
    setProgress(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  return (
    <TapFeedback
      onTouchStart={handleStart}
      onTouchEnd={reset}
      onTouchMove={(e) => {
        // Cancel if moved too much
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
          reset();
        }
      }}
      className={`relative ${className}`}
      {...props}
    >
      {/* Progress indicator */}
      {isPressed && (
        <motion.div
          className="absolute inset-0 bg-blue-500/20 rounded-lg"
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          transition={{ duration: 0 }}
        />
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </TapFeedback>
  );
}

/**
 * PinchZoom Component
 * 
 * Container that allows pinch-to-zoom on mobile.
 */
export function PinchZoom({ children, minZoom = 0.5, maxZoom = 3, className = '' }) {
  const scale = useMotionValue(1);
  const [currentScale, setCurrentScale] = useState(1);
  
  const { handlers } = useTouchGestures({
    onPinch: ({ scale: newScale }) => {
      const clampedScale = Math.max(minZoom, Math.min(maxZoom, currentScale * newScale));
      scale.set(clampedScale);
      setCurrentScale(clampedScale);
    },
    onDoubleTap: () => {
      // Reset zoom on double tap
      const targetScale = currentScale > 1 ? 1 : 2;
      animate(scale, targetScale, {
        type: 'spring',
        stiffness: 300,
        damping: 30
      });
      setCurrentScale(targetScale);
    }
  });
  
  return (
    <motion.div
      {...handlers}
      style={{ scale }}
      className={`touch-none ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * SwipeIndicator Component
 * 
 * Visual indicator for swipe actions.
 */
export function SwipeIndicator({ direction = 'right', className = '' }) {
  const arrows = {
    left: '←',
    right: '→',
    up: '↑',
    down: '↓'
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: direction === 'right' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className={`text-2xl ${className}`}
    >
      {arrows[direction]}
    </motion.div>
  );
}

/**
 * Example Usage:
 * 
 * ```jsx
 * // Touch gestures
 * const { handlers } = useTouchGestures({
 *   onTap: () => console.log('Tapped!'),
 *   onDoubleTap: () => console.log('Double tapped!'),
 *   onSwipeLeft: () => console.log('Swiped left!'),
 *   onLongPress: () => console.log('Long pressed!')
 * });
 * 
 * <div {...handlers}>Touch me!</div>
 * 
 * // Touch target
 * <TouchTarget>
 *   <button className="p-2">
 *     <Icon size={24} />
 *   </button>
 * </TouchTarget>
 * 
 * // Tap feedback
 * <TapFeedback>
 *   <button>Click me</button>
 * </TapFeedback>
 * 
 * // Long press button
 * <LongPressButton
 *   onComplete={() => handleDelete()}
 *   duration={1000}
 * >
 *   Hold to delete
 * </LongPressButton>
 * 
 * // Pinch zoom
 * <PinchZoom minZoom={1} maxZoom={4}>
 *   <img src="/image.jpg" alt="Zoomable" />
 * </PinchZoom>
 * ```
 */