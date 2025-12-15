'use client';
import { useRef, useState, useCallback } from 'react';

/**
 * SpotlightCard Component
 * Premium card with mouse-following spotlight effect
 * Throttled for 60fps performance
 */
export default function SpotlightCard({ children, className = "" }) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const rafRef = useRef(null);

  // Throttled mouse move handler using requestAnimationFrame
  const handleMouseMove = useCallback((e) => {
    if (!divRef.current) return;
    
    // Cancel previous frame if still pending
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // Schedule update for next frame (60fps max)
    rafRef.current = requestAnimationFrame(() => {
      const rect = divRef.current.getBoundingClientRect();
      setPosition({ 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      });
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setOpacity(1);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setOpacity(0);
    // Cancel any pending animation frames
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-deep-black transition-colors duration-300 ${className}`}
    >
      {/* Spotlight effect */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(196, 30, 58, 0.15), transparent 40%)`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}