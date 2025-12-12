'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function EnhancedPullToRefresh({ onRefresh, refreshing = false }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e) => {
      // Only start pulling if at top of page
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling || window.scrollY > 0) return;
      
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;
      const maxDistance = 100;
      
      // Only allow pulling down (positive distance)
      if (distance > 0) {
        setPullDistance(Math.min(distance, maxDistance));
        // Prevent default scrolling when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > 60 && !refreshing) {
        onRefresh();
      }
      
      setPullDistance(0);
      setIsPulling(false);
    };

    const element = document.getElementById('pull-to-refresh-container');
    if (element) {
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      const element = document.getElementById('pull-to-refresh-container');
      if (element) {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isPulling, pullDistance, onRefresh, refreshing]);

  // Don't render if not pulling and not refreshing
  if (pullDistance === 0 && !refreshing) {
    return null;
  }

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-40 pointer-events-none flex justify-center pt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: pullDistance > 20 || refreshing ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className={`
          relative rounded-2xl px-6 py-4 backdrop-blur-lg shadow-2xl border
          ${isDark 
            ? 'bg-gradient-to-b from-jecrc-red/90 to-pink-500/90 border-jecrc-red/30'
            : 'bg-gradient-to-b from-jecrc-red/95 to-rose-500/95 border-jecrc-red/20'
          }
        `}
        animate={{
          y: pullDistance > 60 || refreshing ? 0 : -100,
          scale: pullDistance > 60 ? [0.9, 1.05, 1] : 1
        }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
      >
        <div className="flex items-center gap-3 text-white">
          {refreshing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-5 h-5" />
              </motion.div>
              <span className="font-medium">Refreshing...</span>
            </>
          ) : pullDistance > 60 ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                <ArrowDown className="w-5 h-5" />
              </motion.div>
              <span className="font-medium">Release to Refresh</span>
            </>
          ) : (
            <>
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowDown className="w-5 h-5" />
              </motion.div>
              <span className="font-medium opacity-70">Pull to Refresh</span>
            </>
          )}
        </div>

        {/* Animated particles */}
        {pullDistance > 30 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full opacity-60"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0]
                }}
                transition={{
                  duration: 1 + i * 0.2,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeOut'
                }}
              />
            ))}
          </div>
        )}

        {/* Progress bar based on pull distance */}
        {!refreshing && (
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-white/50 rounded-b-2xl"
            style={{
              width: `${(pullDistance / 100) * 100}%`
            }}
            transition={{ duration: 0.1 }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}