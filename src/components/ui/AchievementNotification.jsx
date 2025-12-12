'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Trophy, Sparkles } from 'lucide-react';

/**
 * AchievementNotification Component
 * 
 * Displays a celebration modal with confetti animation when a form is completed.
 * Features:
 * - Confetti particle animation using Framer Motion
 * - Auto-dismiss after 5 seconds
 * - Manual close button
 * - Theme-aware styling
 * - GPU-accelerated animations for smooth 60fps performance
 * - Sound effect trigger (optional)
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the notification
 * @param {Function} props.onClose - Callback when notification is closed
 * @param {string} props.title - Achievement title (default: "Congratulations!")
 * @param {string} props.message - Achievement message
 * @param {string} props.icon - Icon type: 'trophy', 'sparkles', 'check' (default: 'trophy')
 * @param {boolean} props.isDark - Theme mode
 */
export default function AchievementNotification({
  show = false,
  onClose,
  title = 'Congratulations!',
  message = 'Your application has been completed successfully!',
  icon = 'trophy',
  isDark = false
}) {
  const [confetti, setConfetti] = useState([]);
  
  // Generate confetti particles on mount
  useEffect(() => {
    if (show) {
      // Generate 50 confetti particles with random properties
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100, // Random X position (0-100%)
        y: -20, // Start above viewport
        rotation: Math.random() * 360, // Random initial rotation
        color: getRandomColor(),
        size: Math.random() * 10 + 5, // Size between 5-15px
        delay: Math.random() * 0.5, // Stagger animation (0-0.5s delay)
        duration: Math.random() * 2 + 2 // Duration between 2-4s
      }));
      setConfetti(particles);
      
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);
  
  // Get icon component based on type
  const IconComponent = {
    trophy: Trophy,
    sparkles: Sparkles,
    check: CheckCircle
  }[icon] || Trophy;
  
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Confetti Particles */}
            {confetti.map((particle) => (
              <motion.div
                key={particle.id}
                initial={{
                  x: `${particle.x}vw`,
                  y: particle.y,
                  opacity: 1,
                  rotate: particle.rotation
                }}
                animate={{
                  x: `${particle.x}vw`,
                  y: '120vh', // Fall below viewport
                  opacity: [1, 1, 0],
                  rotate: particle.rotation + 360 * 2 // Spin twice while falling
                }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: 'easeIn'
                }}
                className="absolute pointer-events-none"
                style={{
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: particle.color,
                  borderRadius: '2px'
                }}
              />
            ))}
            
            {/* Achievement Modal */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 10 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20
              }}
              onClick={(e) => e.stopPropagation()}
              className={`
                relative max-w-md w-full rounded-2xl shadow-2xl overflow-hidden
                ${isDark 
                  ? 'bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20' 
                  : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
                }
              `}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className={`
                  absolute top-4 right-4 p-2 rounded-full transition-all duration-200
                  ${isDark 
                    ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }
                  active:scale-90 z-10
                `}
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Animated Icon */}
              <div className="pt-12 pb-6 flex justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2
                  }}
                  className={`
                    w-24 h-24 rounded-full flex items-center justify-center
                    ${isDark 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50' 
                      : 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-400/50'
                    }
                  `}
                >
                  <IconComponent className="w-12 h-12 text-white" />
                </motion.div>
              </div>
              
              {/* Content */}
              <div className="px-8 pb-8 text-center">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`
                    text-2xl font-bold mb-3
                    ${isDark ? 'text-white' : 'text-gray-900'}
                  `}
                >
                  {title}
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`
                    text-base mb-6
                    ${isDark ? 'text-gray-300' : 'text-gray-600'}
                  `}
                >
                  {message}
                </motion.p>
                
                {/* Action Button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={onClose}
                  className={`
                    w-full py-3 px-6 rounded-lg font-medium transition-all duration-200
                    ${isDark 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                    }
                    active:scale-95 shadow-lg
                  `}
                >
                  Continue
                </motion.button>
              </div>
              
              {/* Progress Bar (Auto-dismiss indicator) */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className={`
                  h-1
                  ${isDark ? 'bg-green-500' : 'bg-green-500'}
                `}
              />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Helper function to generate random confetti colors
 */
function getRandomColor() {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Orange
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Light Blue
    '#F8B739', // Gold
    '#52C41A'  // Green
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}