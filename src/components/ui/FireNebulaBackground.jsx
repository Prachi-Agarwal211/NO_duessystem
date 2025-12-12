'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function FireNebulaBackground({ children, intensity = 'low' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Detect mobile devices
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pause animation when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Only render in dark mode
  if (!isDark) {
    return <>{children}</>;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Performance: Adjust particle count based on device
    const particleCount = isMobile ? 5 : intensity === 'low' ? 10 : intensity === 'medium' ? 12 : 15;

    // Fire nebula particles
    class FireParticle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 100;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -Math.random() * 2 - 1;
        this.size = Math.random() * (isMobile ? 40 : 60) + (isMobile ? 15 : 20);
        this.life = 1;
        this.decay = Math.random() * 0.01 + 0.005;
        this.hue = Math.random() * 60; // Red to orange range
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.99;

        // Add flowing movement
        this.vx += (Math.random() - 0.5) * 0.1;

        if (this.life <= 0 || this.size < 1) {
          this.reset();
        }
      }

      draw() {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        
        // Fire colors: red -> orange -> yellow
        gradient.addColorStop(0, `hsla(${this.hue}, 100%, 60%, ${this.life * 0.8})`);
        gradient.addColorStop(0.4, `hsla(${this.hue + 20}, 100%, 50%, ${this.life * 0.4})`);
        gradient.addColorStop(1, `hsla(${this.hue + 40}, 100%, 40%, 0)`);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create fire particles
    const particles = Array.from({ length: particleCount }, () => new FireParticle());

    const animate = () => {
      if (!isVisible) return;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [intensity, isMobile, isVisible]);

  const opacityClasses = {
    low: 'opacity-[0.15]',
    medium: 'opacity-[0.25]',
    high: 'opacity-[0.35]'
  };

  return (
    <div className="relative">
      {/* Fire nebula canvas background */}
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 pointer-events-none ${opacityClasses[intensity]} fire-nebula-canvas`}
        style={{
          mixBlendMode: 'screen',
          transform: 'translateZ(0)', // GPU acceleration
          willChange: 'auto' // Only enable during animation
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}