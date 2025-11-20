import React, { useEffect, useRef } from 'react';

interface BackgroundProps {
  theme: 'dark' | 'light';
}

export const Background: React.FC<BackgroundProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    canvas.width = width;
    canvas.height = height;

    // Mouse state
    const mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // --- Ambient Orbs (Background Atmosphere) ---
    class AmbientOrb {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.3; // Very slow drift
        this.vy = (Math.random() - 0.5) * 0.3;
        this.radius = Math.random() * 400 + 200; 
        this.opacity = Math.random() * 0.1 + 0.05;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Gentle bounce
        if (this.x < -200 || this.x > width + 200) this.vx *= -1;
        if (this.y < -200 || this.y > height + 200) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        
        // COLOR STRATEGY:
        // Dark Mode: Red glow to create the "Red Theme" atmosphere.
        // Light Mode: Silver/Grey glow to keep it clean white (No pink tint).
        let r, g, b;
        if (theme === 'dark') {
            r = 196; g = 30; b = 58; // JECRC Red
        } else {
            r = 200; g = 200; b = 210; // Cool Silver/Grey
        }
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${theme === 'dark' ? 0.15 : 0.12})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        // Blend mode: Screen for dark (glow), Normal/Multiply for light (shadow/depth)
        ctx.globalCompositeOperation = theme === 'dark' ? 'screen' : 'source-over';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; // Reset
      }
    }

    // --- Network Particles (Foreground Data) ---
    class Particle {
      x: number;
      y: number;
      originX: number;
      originY: number;
      vx: number;
      vy: number;
      size: number;

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

        // Wrap around screen
        if (this.originX < 0) this.originX = width;
        if (this.originX > width) this.originX = 0;
        if (this.originY < 0) this.originY = height;
        if (this.originY > height) this.originY = 0;

        // Mouse Attraction Physics
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const mouseRange = 300;

        if (distance < mouseRange) {
            // Stronger attraction for interactivity
            const force = (mouseRange - distance) / mouseRange;
            const angle = Math.atan2(dy, dx);
            const attractionSpeed = 6 * force; // Variable speed based on distance
            
            this.x += Math.cos(angle) * attractionSpeed;
            this.y += Math.sin(angle) * attractionSpeed;
        } else {
            // Elastic snap back to origin
            this.x += (this.originX - this.x) * 0.04;
            this.y += (this.originY - this.y) * 0.04;
        }
      }

      draw() {
        if (!ctx) return;
        
        // COLOR STRATEGY:
        // Dark Mode: White particles (contrast against dark background)
        // Light Mode: RED particles (contrast against white background - brings back the red theme)
        const color = theme === 'dark' ? '255, 255, 255' : '196, 30, 58'; 

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, 0.6)`;
        ctx.fill();
      }
    }

    // Initialize
    const orbs: AmbientOrb[] = Array.from({ length: 6 }, () => new AmbientOrb());
    const particles: Particle[] = Array.from({ length: Math.floor(width * 0.06) }, () => new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Background Orbs
      orbs.forEach(orb => {
        orb.update();
        orb.draw();
      });

      // 2. Particles & Connections
      particles.forEach(p => p.update());

      // COLOR STRATEGY for LINES
      // Dark Mode: White/Cyan hint
      // Light Mode: RED (Sharp technical look)
      const lineR = theme === 'dark' ? 255 : 196;
      const lineG = theme === 'dark' ? 255 : 30;
      const lineB = theme === 'dark' ? 255 : 58;
      const maxDist = 130;

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.draw(); // Draw dot

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            ctx.beginPath();
            // Opacity based on distance
            const opacity = (1 - dist / maxDist) * 0.15;
            ctx.strokeStyle = `rgba(${lineR}, ${lineG}, ${lineB}, ${opacity})`;
            ctx.lineWidth = 0.8;
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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 transition-colors duration-700 ease-smooth pointer-events-none"
      style={{ 
        // Clean Black for Dark, Clean White/Silver for Light
        backgroundColor: theme === 'dark' ? '#050505' : '#FFFFFF'
      }}
    />
  );
};