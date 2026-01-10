'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState, useRef } from 'react';

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
  const [gradientReady, setGradientReady] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    // Force high-end graphics for all users as requested
    setDeviceTier('high');
  }, []);

  // Wait for gradient to be ready before applying transparency
  useEffect(() => {
    setGradientReady(false);
    const timer = setTimeout(() => setGradientReady(true), 50);
    return () => clearTimeout(timer);
  }, [theme]); // Reset on theme change

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-2"
    >
      {/* Top Label - MINIMAL SHADOW */}
      {/* Top Label - MINIMAL SHADOW */}
      <motion.span
        initial={{ letterSpacing: "0.1em", opacity: 0 }}
        animate={{ letterSpacing: "0.18em", opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className={`font-sans text-[10px] md:text-xs font-bold uppercase transition-colors duration-700 ${isDark ? 'text-jecrc-red-bright' : 'text-jecrc-red-dark'
          }`}
        style={{
          textShadow: isDark
            ? '0 0 8px rgba(196, 30, 58, 0.4), 0 1px 3px rgba(0, 0, 0, 0.6)'
            : 'none'
        }}>
        Student Services
      </motion.span>

      {/* Main Title with Chrome Metallic Effect */}
      <div className="relative">
        {/* Pulsing Halo Effect - HIGH END ONLY */}
        {deviceTier === 'high' && (
          <motion.div
            className="absolute inset-0 -z-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at center, rgba(196,30,58,0.4) 0%, rgba(255,51,102,0.2) 40%, transparent 70%)'
                : 'radial-gradient(ellipse at center, rgba(196,30,58,0.3) 0%, rgba(139,0,0,0.15) 40%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        )}

        {/* Background Glow Layer - HIGH END ONLY */}
        {deviceTier === 'high' && isDark && (
          <motion.div
            className="absolute inset-0 blur-3xl opacity-50 -z-10"
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
              background: 'radial-gradient(circle, rgba(196, 30, 58, 0.6) 0%, rgba(255, 51, 102, 0.3) 50%, transparent 100%)',
            }}
          />
        )}

        {/* Chrome Metallic Title Text - FIXED: Only apply transparent when gradient is ready */}
        <h1
          ref={titleRef}
          className={`font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight relative z-10 transition-all duration-700 ${isDark ? 'text-chrome-emboss' : 'text-hero-light'
            }`}
        >
          NO DUES
        </h1>
      </div>

      {/* Decorative Line with Liquid Flow */}
      <div className="relative h-[1px] w-20 mt-4 overflow-hidden">
        <div className={`absolute inset-0 transition-colors duration-700 ease-smooth ${isDark ? 'bg-white/20' : 'bg-black/10'
          }`}></div>

        {/* Animated Gradient Line */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "linear"
          }}
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent 0%, rgba(196, 30, 58, 0.7) 30%, rgba(255, 51, 102, 0.9) 50%, rgba(196, 30, 58, 0.7) 70%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(196, 30, 58, 0.5) 30%, rgba(196, 30, 58, 0.8) 50%, rgba(196, 30, 58, 0.5) 70%, transparent 100%)',
            boxShadow: isDark
              ? '0 0 6px rgba(196, 30, 58, 0.4)'
              : 'none'
          }}
        />
      </div>

    </motion.div>
  );
}