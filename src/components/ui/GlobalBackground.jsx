'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Optimized GlobalBackground Component
 * Consolidates functionality from Background.jsx, AuroraBackground.jsx, and FireNebulaBackground.jsx
 * Single, performant background system with theme-aware visuals
 *
 * Performance Features:
 * - CSS-only animations (no JavaScript overhead)
 * - GPU-accelerated transforms
 * - Conditional rendering based on device capabilities
 * - Optimized for mobile devices
 */
export default function GlobalBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isMobile, setIsMobile] = useState(false);
  const [isLowEnd, setIsLowEnd] = useState(false);
  const [isVeryLowEnd, setIsVeryLowEnd] = useState(false);

  // Detect mobile devices and low-end devices for performance optimization
  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // ✅ PERFORMANCE: Progressive device detection for tiered optimization
      // Very low-end: < 2GB RAM or slow connection
      const veryLowEnd = (navigator.deviceMemory && navigator.deviceMemory < 2) ||
                         (navigator.connection && navigator.connection.saveData) ||
                         (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
      
      // Low-end: < 4GB RAM or mobile
      const lowEnd = mobile || (navigator.deviceMemory && navigator.deviceMemory < 4) || veryLowEnd;
      
      setIsVeryLowEnd(veryLowEnd);
      setIsLowEnd(lowEnd);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
      {/* 1. Base Layer - Prevents white flashes */}
      <div
        className={`absolute inset-0 transition-colors duration-700 ${
          isDark ? 'bg-black' : 'bg-white'
        }`}
      />

      {/* 2. JECRC Campus Image (Subtle watermark) - Desktop only for performance */}
      {!isMobile && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
          style={{
            backgroundImage: "url('/assets/9-1-1536x720.jpg')",
            opacity: isDark ? 0.08 : 0.35,
            mixBlendMode: isDark ? 'screen' : 'multiply',
            filter: isDark ? 'brightness(0.6) contrast(0.8) saturate(0.2) blur(1.5px)' : 'brightness(0.9) contrast(1.1)',
            transform: 'translateZ(0)', // GPU acceleration
            willChange: 'opacity'
          }}
        />
      )}

      {/* 3. Animated Gradient Mesh Blobs - PROGRESSIVE OPTIMIZATION */}
      {!isVeryLowEnd && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${
          isDark ? 'opacity-70' : 'opacity-60'
        }`}>
          {/* Top Left Blob */}
          <div
            className={`
              absolute top-[-20%] left-[-20%] w-[60%] h-[60%]
              bg-gradient-to-br rounded-full
              ${isDark
                ? 'from-jecrc-red/80 via-jecrc-red/50 to-transparent'
                : 'from-red-300/70 via-rose-300/50 to-transparent'
              }
              ${isVeryLowEnd ? 'blur-[20px]' : isLowEnd ? 'blur-[30px]' : isMobile ? 'blur-[40px]' : 'blur-[60px]'}
              ${isVeryLowEnd || isLowEnd ? 'animate-blob-slow-simple' : 'animate-blob-slow'}
            `}
            style={{
              transform: 'translateZ(0)',
              willChange: isVeryLowEnd || isLowEnd ? 'auto' : 'transform'
            }}
          />
          
          {/* Top Right Blob */}
          <div
            className={`
              absolute top-[-20%] right-[-20%] w-[60%] h-[60%]
              bg-gradient-to-bl rounded-full
              ${isDark
                ? 'from-jecrc-red-bright/70 via-jecrc-red-dark/40 to-transparent'
                : 'from-rose-400/70 via-pink-300/50 to-transparent'
              }
              ${isVeryLowEnd ? 'blur-[20px]' : isLowEnd ? 'blur-[30px]' : isMobile ? 'blur-[40px]' : 'blur-[60px]'}
              ${isVeryLowEnd || isLowEnd ? 'animate-blob-slow-simple animation-delay-2000' : 'animate-blob-slow animation-delay-2000'}
            `}
            style={{
              transform: 'translateZ(0)',
              willChange: isVeryLowEnd || isLowEnd ? 'auto' : 'transform'
            }}
          />
          
          {/* Bottom Blob - Desktop only, skip on low-end */}
          {!isMobile && !isLowEnd && !isVeryLowEnd && (
            <div
              className={`
                absolute bottom-[-20%] left-[10%] w-[50%] h-[50%]
                bg-gradient-to-tr rounded-full
                ${isDark
                  ? 'from-jecrc-red-dark/70 via-jecrc-red/40 to-transparent'
                  : 'from-blue-300/60 via-indigo-300/40 to-transparent'
                }
                blur-[60px]
                animate-blob-slow animation-delay-4000
              `}
              style={{
                transform: 'translateZ(0)',
                willChange: 'transform'
              }}
            />
          )}
        </div>
      )}

      {/* 4. Aurora Flow Animation (CSS-only, GPU-accelerated) - PROGRESSIVE OPTIMIZATION */}
      {!isVeryLowEnd && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${
          isDark ? 'opacity-40' : 'opacity-30'
        } ${isVeryLowEnd || isLowEnd ? 'animate-aurora-flow-simple' : 'animate-aurora-flow'}`}>
          <div
            className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%]"
            style={{
              background: isDark
                ? 'conic-gradient(from 90deg at 50% 50%, #00000000 50%, rgba(196, 30, 58, 0.12) 50%), radial-gradient(rgba(196, 30, 58, 0.15) 0%, transparent 50%)'
                : 'conic-gradient(from 90deg at 50% 50%, #00000000 50%, rgba(255, 229, 233, 0.25) 50%), radial-gradient(rgba(255, 209, 217, 0.25) 0%, transparent 50%)',
              transform: 'translateZ(0)',
              willChange: isVeryLowEnd || isLowEnd ? 'auto' : 'transform'
            }}
          />
        </div>
      )}

      {/* 5. Subtle Grid Overlay - Desktop only, skip on low-end and very low-end */}
      {!isMobile && !isLowEnd && !isVeryLowEnd && (
        <div
          className={`absolute inset-0 bg-center transition-opacity duration-700 ${
            isDark ? 'opacity-5' : 'opacity-10'
          }`}
          style={{
            backgroundImage: "url('/grid.svg')",
            backgroundSize: '30px 30px',
            maskImage: 'linear-gradient(180deg, white, rgba(255, 255, 255, 0))',
            transform: 'translateZ(0)'
          }}
        />
      )}

      {/* 6. Subtle grain texture for depth */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          transform: 'translateZ(0)'
        }}
      />
    </div>
  );
}