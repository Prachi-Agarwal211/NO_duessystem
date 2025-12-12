'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * TiltCard Component
 * 
 * Card with 3D tilt effect on mouse/touch move.
 * Features:
 * - Gyroscope-like 3D rotation
 * - Smooth spring physics
 * - Configurable tilt intensity
 * - Shine/glare effect on tilt
 * - Touch-optimized for mobile
 * - GPU-accelerated transforms
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Card content
 * @param {number} props.maxTilt - Max tilt angle in degrees (default: 15)
 * @param {number} props.perspective - Perspective distance (default: 1000)
 * @param {boolean} props.glare - Enable glare effect (default: true)
 * @param {number} props.glareIntensity - Glare opacity (default: 0.3)
 * @param {boolean} props.scale - Scale up on hover (default: true)
 * @param {number} props.scaleAmount - Scale multiplier (default: 1.05)
 * @param {Object} props.springConfig - Spring animation config
 * @param {string} props.className - Additional CSS classes
 */
export default function TiltCard({
  children,
  maxTilt = 15,
  perspective = 1000,
  glare = true,
  glareIntensity = 0.3,
  scale = true,
  scaleAmount = 1.05,
  springConfig = { stiffness: 300, damping: 30 },
  className = ''
}) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Motion values for rotation
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Spring physics for smooth movement
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig);
  
  // Transform for glare position
  const glareX = useTransform(x, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(y, [-0.5, 0.5], ['0%', '100%']);
  
  // Handle mouse move
  const handleMouseMove = (event) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate normalized position (-0.5 to 0.5)
    const normalizedX = (event.clientX - centerX) / (rect.width / 2);
    const normalizedY = (event.clientY - centerY) / (rect.height / 2);
    
    x.set(normalizedX);
    y.set(normalizedY);
  };
  
  // Handle touch move
  const handleTouchMove = (event) => {
    if (!ref.current || event.touches.length === 0) return;
    
    const touch = event.touches[0];
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const normalizedX = (touch.clientX - centerX) / (rect.width / 2);
    const normalizedY = (touch.clientY - centerY) / (rect.height / 2);
    
    x.set(normalizedX);
    y.set(normalizedY);
  };
  
  // Reset on leave
  const handleLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };
  
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleLeave}
      style={{
        perspective: `${perspective}px`,
        transformStyle: 'preserve-3d'
      }}
      className={`relative ${className}`}
      whileHover={scale ? { scale: scaleAmount } : {}}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d'
        }}
        className="relative w-full h-full"
      >
        {/* Glare Effect */}
        {glare && isHovered && (
          <motion.div
            style={{
              left: glareX,
              top: glareY,
              opacity: glareIntensity
            }}
            className="absolute w-64 h-64 rounded-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: glareIntensity }}
            exit={{ opacity: 0 }}
          >
            <div className="w-full h-full bg-gradient-radial from-white/50 to-transparent blur-2xl" />
          </motion.div>
        )}
        
        {/* Card Content */}
        <div style={{ transform: 'translateZ(20px)' }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * TiltCardStack Component
 * 
 * Stack of cards with 3D tilt effect and depth.
 * Each card has different z-index for parallax effect.
 */
export function TiltCardStack({ cards = [], className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {cards.map((card, index) => (
        <TiltCard
          key={index}
          className="absolute inset-0"
          style={{
            zIndex: cards.length - index,
            transform: `translateZ(${index * 20}px)`
          }}
        >
          {card}
        </TiltCard>
      ))}
    </div>
  );
}

/**
 * useTilt Hook
 * 
 * Headless hook for implementing custom tilt effects.
 * Provides all the logic without any UI components.
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} Tilt state and handlers
 */
export function useTilt(options = {}) {
  const {
    maxTilt = 15,
    perspective = 1000,
    springConfig = { stiffness: 300, damping: 30 }
  } = options;
  
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useSpring(
    useTransform(y, [-0.5, 0.5], [-maxTilt, maxTilt]),
    springConfig
  );
  const rotateY = useSpring(
    useTransform(x, [-0.5, 0.5], [maxTilt, -maxTilt]),
    springConfig
  );
  
  const handleMove = (clientX, clientY) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const normalizedX = (clientX - centerX) / (rect.width / 2);
    const normalizedY = (clientY - centerY) / (rect.height / 2);
    
    x.set(normalizedX);
    y.set(normalizedY);
  };
  
  const reset = () => {
    x.set(0);
    y.set(0);
  };
  
  return {
    ref,
    rotateX,
    rotateY,
    perspective,
    handlers: {
      onMouseMove: (e) => handleMove(e.clientX, e.clientY),
      onMouseLeave: reset,
      onTouchMove: (e) => {
        if (e.touches.length > 0) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      onTouchEnd: reset
    }
  };
}

/**
 * TiltText Component
 * 
 * Text with 3D tilt effect for headings.
 */
export function TiltText({ children, className = '', ...props }) {
  return (
    <TiltCard
      maxTilt={10}
      scale={false}
      glare={false}
      className={className}
      {...props}
    >
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {children}
      </h1>
    </TiltCard>
  );
}

/**
 * TiltImage Component
 * 
 * Image with 3D tilt effect and depth layers.
 */
export function TiltImage({ src, alt, className = '', ...props }) {
  return (
    <TiltCard className={className} {...props}>
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          style={{ transform: 'translateZ(30px)' }}
        />
        {/* Shadow layer for depth */}
        <div
          className="absolute inset-0 bg-black/20"
          style={{ transform: 'translateZ(0px)' }}
        />
      </div>
    </TiltCard>
  );
}

/**
 * ParallaxTiltCard Component
 * 
 * Card with parallax layers that move at different speeds.
 */
export function ParallaxTiltCard({ layers = [], className = '' }) {
  const { ref, rotateX, rotateY, perspective, handlers } = useTilt();
  
  return (
    <motion.div
      ref={ref}
      {...handlers}
      style={{ perspective }}
      className={`relative ${className}`}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative w-full h-full"
      >
        {layers.map((layer, index) => (
          <div
            key={index}
            style={{
              transform: `translateZ(${layer.depth || index * 20}px)`,
              position: index > 0 ? 'absolute' : 'relative',
              inset: 0
            }}
          >
            {layer.content}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/**
 * Example Usage:
 * 
 * ```jsx
 * // Basic tilt card
 * <TiltCard>
 *   <div className="p-6 bg-white rounded-lg shadow-lg">
 *     <h3>Hover me!</h3>
 *     <p>I tilt in 3D</p>
 *   </div>
 * </TiltCard>
 * 
 * // Tilt with custom settings
 * <TiltCard
 *   maxTilt={20}
 *   glareIntensity={0.5}
 *   scaleAmount={1.1}
 * >
 *   <StatsCard {...props} />
 * </TiltCard>
 * 
 * // Parallax layers
 * <ParallaxTiltCard
 *   layers={[
 *     { content: <Background />, depth: 0 },
 *     { content: <Content />, depth: 20 },
 *     { content: <Foreground />, depth: 40 }
 *   ]}
 * />
 * ```
 */