'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * GradientText Component
 * 
 * Displays text with an animated gradient that shifts colors over time.
 * Features:
 * - Smooth gradient animation with configurable speed
 * - Multiple gradient presets
 * - Custom gradient colors support
 * - GPU-accelerated background animation
 * - Respects prefers-reduced-motion
 * - Responsive and accessible
 * 
 * @param {Object} props
 * @param {string} props.children - Text content to display
 * @param {string} props.preset - Gradient preset: 'fire', 'ocean', 'sunset', 'forest', 'purple', 'rainbow'
 * @param {Array} props.colors - Custom gradient colors (overrides preset)
 * @param {number} props.speed - Animation speed in seconds (default: 3)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.as - HTML element type (default: 'span')
 */
export default function GradientText({
  children,
  preset = 'fire',
  colors = null,
  speed = 3,
  className = '',
  as = 'span'
}) {
  // Gradient presets
  const presets = {
    fire: ['#FF6B6B', '#EE5A6F', '#F06292', '#E91E63'],
    ocean: ['#0093E9', '#80D0C7', '#13B0F5', '#00C6FF'],
    sunset: ['#FF512F', '#DD2476', '#F09819', '#EDDE5D'],
    forest: ['#134E5E', '#71B280', '#56AB2F', '#A8E063'],
    purple: ['#667EEA', '#764BA2', '#F093FB', '#4FACFE'],
    rainbow: ['#FF0080', '#FF8C00', '#40E0D0', '#7B68EE', '#FF1493'],
    jecrc: ['#DC2626', '#B91C1C', '#991B1B', '#7F1D1D'] // JECRC Red theme
  };
  
  const gradientColors = colors || presets[preset] || presets.fire;
  
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  
  // Create gradient string
  const gradient = `linear-gradient(90deg, ${gradientColors.join(', ')})`;
  
  const Component = as;
  
  return (
    <Component
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: gradient,
        backgroundSize: prefersReducedMotion ? '100%' : '200% 200%',
        animation: prefersReducedMotion ? 'none' : `gradient-shift ${speed}s ease infinite`
      }}
    >
      {children}
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </Component>
  );
}

/**
 * AnimatedGradientText Component
 * 
 * Text with both gradient AND entrance animation using Framer Motion.
 * Combines gradient shifting with slide-in/fade-in effects.
 * 
 * @param {Object} props
 * @param {string} props.children - Text content
 * @param {string} props.preset - Gradient preset
 * @param {number} props.delay - Entrance animation delay (default: 0)
 * @param {string} props.direction - Slide direction: 'up', 'down', 'left', 'right'
 * @param {string} props.className - Additional CSS classes
 */
export function AnimatedGradientText({
  children,
  preset = 'fire',
  delay = 0,
  direction = 'up',
  className = ''
}) {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 }
  };
  
  const initial = {
    opacity: 0,
    ...directions[direction]
  };
  
  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={className}
    >
      <GradientText preset={preset}>
        {children}
      </GradientText>
    </motion.div>
  );
}

/**
 * GlowingGradientText Component
 * 
 * Gradient text with an animated glow effect.
 * Perfect for hero sections and call-to-action text.
 * 
 * @param {Object} props
 * @param {string} props.children - Text content
 * @param {string} props.preset - Gradient preset
 * @param {boolean} props.glow - Enable glow effect (default: true)
 * @param {string} props.glowColor - Custom glow color (default: from gradient)
 * @param {string} props.className - Additional CSS classes
 */
export function GlowingGradientText({
  children,
  preset = 'fire',
  glow = true,
  glowColor = null,
  className = ''
}) {
  const presets = {
    fire: '#FF6B6B',
    ocean: '#0093E9',
    sunset: '#FF512F',
    forest: '#134E5E',
    purple: '#667EEA',
    rainbow: '#FF0080',
    jecrc: '#DC2626'
  };
  
  const shadowColor = glowColor || presets[preset] || presets.fire;
  
  return (
    <GradientText
      preset={preset}
      className={className}
      style={{
        textShadow: glow
          ? `0 0 20px ${shadowColor}40, 0 0 40px ${shadowColor}20, 0 0 60px ${shadowColor}10`
          : 'none'
      }}
    >
      {children}
    </GradientText>
  );
}

/**
 * TypewriterGradientText Component
 * 
 * Gradient text with typewriter animation effect.
 * Text appears character by character with gradient.
 * 
 * @param {Object} props
 * @param {string} props.text - Text to display
 * @param {string} props.preset - Gradient preset
 * @param {number} props.speed - Typing speed in ms per character (default: 100)
 * @param {number} props.delay - Delay before starting (default: 0)
 * @param {string} props.className - Additional CSS classes
 */
export function TypewriterGradientText({
  text = '',
  preset = 'fire',
  speed = 100,
  delay = 0,
  className = ''
}) {
  const [displayedText, setDisplayedText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);
  
  React.useEffect(() => {
    if (currentIndex >= text.length) return;
    
    const timeout = setTimeout(() => {
      setDisplayedText(prev => prev + text[currentIndex]);
      setCurrentIndex(prev => prev + 1);
    }, currentIndex === 0 ? delay : speed);
    
    return () => clearTimeout(timeout);
  }, [currentIndex, text, speed, delay]);
  
  return (
    <GradientText preset={preset} className={className}>
      {displayedText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        className="inline-block w-0.5 h-[1em] bg-current ml-0.5"
      />
    </GradientText>
  );
}