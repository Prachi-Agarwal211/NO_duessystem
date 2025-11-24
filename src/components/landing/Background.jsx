'use client';

import { useEffect, useRef } from 'react';
import { calculateOptimalParticleCount, prefersReducedMotion } from '@/hooks/useDeviceDetection';

export default function Background({ theme }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Skip animation if user prefers reduced motion (keep canvas transparent)
    if (prefersReducedMotion()) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let animationFrameId;
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    canvas.width = width;
    canvas.height = height;

    // Device detection for performance optimization
    const isTouchDevice = 'ontouchstart' in window ||
      window.matchMedia('(pointer: coarse)').matches;
    const isMobile = isTouchDevice || width < 768;

    // Mouse state (only used on non-touch devices)
    const mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e) => {
      if (!isTouchDevice) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      }
    };

    // Only track mouse on non-touch devices
    if (!isTouchDevice) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    // Ambient Orbs (Background Atmosphere)
    class AmbientOrb {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.radius = Math.random() * 400 + 200;
        this.opacity = Math.random() * 0.1 + 0.05;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -200 || this.x > width + 200) this.vx *= -1;
        if (this.y < -200 || this.y > height + 200) this.vy *= -1;
      }

      draw() {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        
        let r, g, b, opacity;
        if (theme === 'dark') {
          // Dark mode: Red glow
          r = 196; g = 30; b = 58;
          opacity = 0.15;
        } else {
          // Light mode: Soft pink/rose glow
          r = 255; g = 229; b = 233; // Light pink
          opacity = 0.25; // More visible for gradient effect
        }
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.globalCompositeOperation = theme === 'dark' ? 'screen' : 'normal';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // Network Particles (Optimized for mobile)
    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.originX = this.x;
        this.originY = this.y;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 0.5;
      }

      update() {
        this.originX += this.vx;
        this.originY += this.vy;

        // Boundary wrapping
        if (this.originX < 0) this.originX = width;
        if (this.originX > width) this.originX = 0;
        if (this.originY < 0) this.originY = height;
        if (this.originY > height) this.originY = 0;

        // Mouse attraction only on non-touch devices
        if (!isTouchDevice) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const mouseRange = 300;

          if (distance < mouseRange) {
            const force = (mouseRange - distance) / mouseRange;
            const angle = Math.atan2(dy, dx);
            const attractionSpeed = 6 * force;
            
            this.x += Math.cos(angle) * attractionSpeed;
            this.y += Math.sin(angle) * attractionSpeed;
          } else {
            this.x += (this.originX - this.x) * 0.04;
            this.y += (this.originY - this.y) * 0.04;
          }
        } else {
          // Auto-pilot mode for touch devices (gentler movement)
          this.x += (this.originX - this.x) * 0.02;
          this.y += (this.originY - this.y) * 0.02;
        }
      }

      draw() {
        // White particles in dark mode, Red particles in light mode
        let color, opacity;
        if (theme === 'dark') {
          color = '255, 255, 255'; // White
          opacity = 0.6;
        } else {
          color = '196, 30, 58'; // JECRC Red
          opacity = 0.5; // Slightly more subtle in light
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${opacity})`;
        ctx.fill();
      }
    }

    // Initialize with optimized counts
    const orbCount = isMobile ? 3 : 6; // Reduce orbs on mobile
    const particleCount = calculateOptimalParticleCount(width, isMobile);
    
    const orbs = Array.from({ length: orbCount }, () => new AmbientOrb());
    const particles = Array.from({ length: particleCount }, () => new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Background Orbs
      orbs.forEach(orb => {
        orb.update();
        orb.draw();
      });

      // Particles & Connections
      particles.forEach(p => p.update());

      // White lines in dark mode, Red lines in light mode
      const lineR = theme === 'dark' ? 255 : 196;
      const lineG = theme === 'dark' ? 255 : 30;
      const lineB = theme === 'dark' ? 255 : 58;
      const maxDist = 130;
      const baseOpacity = theme === 'dark' ? 0.15 : 0.12;

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.draw();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            ctx.beginPath();
            const opacity = (1 - dist / maxDist) * baseOpacity;
            ctx.strokeStyle = `rgba(${lineR}, ${lineG}, ${lineB}, ${opacity})`;
            ctx.lineWidth = theme === 'dark' ? 0.8 : 0.6;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (!isTouchDevice) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 transition-colors duration-700 ease-smooth pointer-events-none"
      style={{
        background: 'transparent',
        zIndex: 1
      }}
    />
  );
}