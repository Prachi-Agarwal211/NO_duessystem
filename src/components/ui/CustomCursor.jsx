'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, useSpring } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

export default function CustomCursor() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Smooth spring physics for cursor movement
  const cursorX = useSpring(0, { damping: 25, stiffness: 400, mass: 0.5 });
  const cursorY = useSpring(0, { damping: 25, stiffness: 400, mass: 0.5 });
  
  // Ring follows slower for trail effect
  const ringX = useSpring(0, { damping: 30, stiffness: 200, mass: 0.8 });
  const ringY = useSpring(0, { damping: 30, stiffness: 200, mass: 0.8 });

  const updateMousePosition = useCallback((e) => {
    const { clientX, clientY } = e;
    setMousePosition({ x: clientX, y: clientY });
    cursorX.set(clientX);
    cursorY.set(clientY);
    ringX.set(clientX);
    ringY.set(clientY);
    
    if (!isVisible) setIsVisible(true);
  }, [cursorX, cursorY, ringX, ringY, isVisible]);

  const checkHoverState = useCallback((e) => {
    const target = e.target;
    const isInteractive = 
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.interactive') ||
      target.closest('[role="button"]') ||
      window.getComputedStyle(target).cursor === 'pointer';
    
    setIsHovering(isInteractive);
  }, []);

  const handleMouseDown = useCallback(() => setIsClicking(true), []);
  const handleMouseUp = useCallback(() => setIsClicking(false), []);
  const handleMouseLeave = useCallback(() => setIsVisible(false), []);
  const handleMouseEnter = useCallback(() => setIsVisible(true), []);

  useEffect(() => {
    // Only enable on devices with fine pointer (desktop/laptop with mouse)
    if (window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener('mousemove', updateMousePosition);
      window.addEventListener('mouseover', checkHoverState);
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('mouseenter', handleMouseEnter);

      return () => {
        window.removeEventListener('mousemove', updateMousePosition);
        window.removeEventListener('mouseover', checkHoverState);
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mouseleave', handleMouseLeave);
        document.removeEventListener('mouseenter', handleMouseEnter);
      };
    }
  }, [updateMousePosition, checkHoverState, handleMouseDown, handleMouseUp, handleMouseLeave, handleMouseEnter]);

  // Hide on mobile/touch devices
  if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) {
    return null;
  }

  if (!isVisible) return null;

  const accentColor = isDark ? '#FF3366' : '#C41E3A';
  const dotColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <>
      {/* Outer Ring - Trailing effect */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        <motion.div
          className="relative"
          animate={{
            scale: isClicking ? 0.8 : isHovering ? 1.5 : 1,
            rotate: isHovering ? 90 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
        >
          {/* Main ring */}
          <div
            className="w-10 h-10 rounded-full border-2 transition-colors duration-200"
            style={{
              borderColor: isHovering ? accentColor : dotColor,
              opacity: 0.6,
            }}
          />
          
          {/* Spinning particles when hovering */}
          {isHovering && (
            <>
              <motion.div
                className="absolute top-0 left-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: accentColor, x: '-50%', y: '-120%' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute bottom-0 left-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: accentColor, x: '-50%', y: '120%' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 0.5 }}
              />
              <motion.div
                className="absolute top-1/2 left-0 w-1 h-1 rounded-full"
                style={{ backgroundColor: accentColor, x: '-120%', y: '-50%' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 1 }}
              />
              <motion.div
                className="absolute top-1/2 right-0 w-1 h-1 rounded-full"
                style={{ backgroundColor: accentColor, x: '120%', y: '-50%' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 1.5 }}
              />
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Center Dot - Fast response */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10000] mix-blend-difference"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        <motion.div
          animate={{
            scale: isClicking ? 0.5 : isHovering ? 0 : 1,
            opacity: isClicking ? 1 : isHovering ? 0 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 28,
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: dotColor,
              boxShadow: `0 0 10px ${dotColor}`,
            }}
          />
        </motion.div>

        {/* Click ripple effect */}
        {isClicking && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2"
            style={{ borderColor: accentColor }}
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </motion.div>

      {/* Hover glow effect */}
      {isHovering && (
        <motion.div
          className="fixed top-0 left-0 pointer-events-none z-[9998]"
          style={{
            x: ringX,
            y: ringY,
            translateX: '-50%',
            translateY: '-50%',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.3, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          <div
            className="w-16 h-16 rounded-full blur-xl"
            style={{
              background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
            }}
          />
        </motion.div>
      )}
    </>
  );
}