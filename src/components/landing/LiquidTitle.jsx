'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';

/**
 * LiquidTitle - Animated gradient title with liquid flow effect
 * - Animated mesh gradient background
 * - Flowing liquid animation
 * - Enhanced glow effects
 * - Optimized for performance (CSS-only on low-end devices)
 */
export default function LiquidTitle() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [deviceTier, setDeviceTier] = useState('high');
  
  useEffect(() => {
    const detectDevice = () => {
      const isMobile = window.innerWidth < 768;
      const isVeryLowEnd = (navigator.deviceMemory && navigator.deviceMemory < 2) ||
                           (navigator.connection && navigator.connection.saveData);
      const isLowEnd = isMobile || (navigator.deviceMemory && navigator.deviceMemory < 4);
      
      if (isVeryLowEnd) {
        setDeviceTier('very-low');
      } else if (isLowEnd) {
        setDeviceTier('low');
      } else {
        setDeviceTier('high');
      }
    };
    
    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-2"
    >
      {/* Top Label - MINIMAL SHADOW */}
      <span className={`font-sans text-[10px] md:text-xs font-bold tracking-[0.5em] uppercase transition-colors duration-700 ${
        isDark ? 'text-jecrc-red-bright' : 'text-jecrc-red-dark'
      }`}
      style={{
        textShadow: isDark
          ? '0 0 8px rgba(196, 30, 58, 0.4), 0 1px 3px rgba(0, 0, 0, 0.6)'
          : 'none'
      }}>
        Student Services
      </span>

      {/* Main Title with Liquid Gradient */}
      <div className="relative">
        {/* Background Glow Layer - HIGH END ONLY */}
        {deviceTier === 'high' && isDark && (
          <motion.div
            className="absolute inset-0 blur-3xl opacity-50"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: 'radial-gradient(circle, rgba(196, 30, 58, 0.6) 0%, rgba(255, 182, 193, 0.3) 50%, transparent 100%)',
            }}
          />
        )}

        {/* Title Text with Premium Metallic Gradient - REFINED */}
        <h1
          className="font-serif text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight transition-all duration-700 ease-smooth relative z-10"
          style={isDark ? {
            backgroundImage: deviceTier !== 'very-low'
              ? 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 20%, #FFC0CB 40%, #FF6B9D 65%, #C41E3A 100%)'
              : '#FFFFFF',
            backgroundSize: '200% 200%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: deviceTier === 'high'
              ? 'drop-shadow(0 2px 8px rgba(255, 107, 157, 0.35)) drop-shadow(0 1px 2px rgba(255, 255, 255, 0.5))'
              : 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5))',
            animation: deviceTier === 'high' ? 'gradient-shift 8s ease-in-out infinite' : 'none'
          } : {
            backgroundImage: deviceTier !== 'very-low'
              ? 'linear-gradient(135deg, #8B0000 0%, #C41E3A 30%, #1F2937 70%, #374151 100%)'
              : '#1F2937',
            backgroundSize: '200% 200%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2))',
            animation: deviceTier === 'high' ? 'gradient-shift 8s ease-in-out infinite' : 'none'
          }}
        >
          NO DUES
        </h1>
      </div>

      {/* Decorative Line with Liquid Flow */}
      <div className="relative h-[1px] w-20 mt-4 overflow-hidden">
        <div className={`absolute inset-0 transition-colors duration-700 ease-smooth ${
          isDark ? 'bg-white/20' : 'bg-black/10'
        }`}></div>
        
        {/* Animated Gradient Line */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ 
            repeat: Infinity, 
            duration: deviceTier === 'very-low' ? 3 : 2, 
            ease: "linear" 
          }}
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent 0%, rgba(196, 30, 58, 0.7) 30%, rgba(255, 105, 180, 0.9) 50%, rgba(196, 30, 58, 0.7) 70%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(196, 30, 58, 0.5) 30%, rgba(196, 30, 58, 0.8) 50%, rgba(196, 30, 58, 0.5) 70%, transparent 100%)',
            boxShadow: isDark && deviceTier === 'high'
              ? '0 0 6px rgba(196, 30, 58, 0.4)'
              : 'none'
          }}
        />
      </div>

      {/* Add keyframe animation to globals.css */}
      <style jsx global>{`
        @keyframes liquid-flow {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </motion.div>
  );
}