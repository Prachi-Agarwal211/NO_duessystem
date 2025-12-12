'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

function LoadingSpinner({ size = 'md', text = '', variant = 'gradient' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Size variants for both spinner and text
  const sizeClasses = {
    sm: { spinner: 'w-6 h-6', text: 'text-xs' },
    md: { spinner: 'w-10 h-10', text: 'text-sm' },
    lg: { spinner: 'w-14 h-14', text: 'text-base' },
    xl: { spinner: 'w-20 h-20', text: 'text-lg' }
  };

  const currentSize = sizeClasses[size];

  // Creative gradient morphing spinner
  if (variant === 'gradient') {
    return (
      <div className="flex flex-col justify-center items-center gap-3">
        <div 
          className={`${currentSize.spinner} relative animate-pulse-slow`}
          style={{
            // Performance: GPU-accelerated transforms only
            transform: 'translateZ(0)',
            willChange: 'transform'
          }}
        >
          {/* Animated gradient blobs */}
          <div className="absolute inset-0 rounded-full animate-gradient-shift">
            <div className={`w-full h-full rounded-full bg-gradient-to-tr ${
              isDark 
                ? 'from-jecrc-red via-pink-500 to-jecrc-red' 
                : 'from-jecrc-red/80 via-rose-500/80 to-jecrc-red/80'
            } animate-spin-slow`} />
          </div>
          
          {/* Inner glow */}
          <div className={`absolute inset-1 rounded-full ${
            isDark ? 'bg-black/40' : 'bg-white/40'
          }`} />
          
          {/* Center pulse */}
          <div className={`absolute inset-0 flex items-center justify-center`}>
            <div className={`w-2 h-2 rounded-full ${
              isDark ? 'bg-white' : 'bg-jecrc-red'
            } animate-pulse`} />
          </div>
        </div>
        
        {text && (
          <p className={`${currentSize.text} font-medium transition-colors duration-700 ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {text}
          </p>
        )}
      </div>
    );
  }

  // Fallback to original spinner for compatibility
  return (
    <div className="flex flex-col justify-center items-center gap-3">
      <div
        className={`animate-spin rounded-full border-2 ${
          isDark ? 'border-white border-b-transparent' : 'border-ink-black border-b-transparent'
        } ${currentSize.spinner}`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className={`${currentSize.text} font-medium transition-colors duration-700 ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {text}
        </p>
      )}
    </div>
  );
}

export default React.memo(LoadingSpinner);