'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Optimized DataUpdateFeedback Component
 * 
 * SIMPLIFIED: Removed Framer Motion for better performance
 * - Pure CSS transitions and animations
 * - Zero JavaScript animation overhead
 * - Clean toast-style notifications
 * - Auto-dismiss with progress indicator
 */
export default function DataUpdateFeedback({ 
  updates = [], 
  duration = 3000 
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none space-y-2">
      {updates.map((update, index) => (
        <NotificationToast 
          key={`${update.type}-${update.id}`}
          update={update}
          index={index}
          duration={duration}
          isDark={isDark}
        />
      ))}
    </div>
  );
}

function NotificationToast({ update, index, duration, isDark }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-dismiss after duration
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => setIsVisible(false), 300); // Allow exit animation
    }, duration);

    return () => clearTimeout(dismissTimer);
  }, [duration]);

  if (!isVisible) return null;

  const typeStyles = {
    success: isDark 
      ? 'bg-green-500/95 border-green-500/30 text-green-50'
      : 'bg-green-500/95 border-green-500/20 text-white',
    info: isDark
      ? 'bg-blue-500/95 border-blue-500/30 text-blue-50'
      : 'bg-blue-500/95 border-blue-500/20 text-white',
    error: isDark
      ? 'bg-red-500/95 border-red-500/30 text-red-50'
      : 'bg-red-500/95 border-red-500/20 text-white'
  };

  const icons = {
    success: CheckCircle,
    info: TrendingUp,
    error: AlertCircle
  };

  const Icon = icons[update.type] || CheckCircle;

  return (
    <div
      className={`
        px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border
        flex items-center gap-3 min-w-[300px]
        ${typeStyles[update.type] || typeStyles.success}
        transition-all duration-300
        ${isExiting 
          ? 'opacity-0 translate-x-full scale-95' 
          : 'opacity-100 translate-x-0 scale-100'
        }
      `}
      style={{
        marginTop: `${index * 60}px`,
        transform: 'translateZ(0)', // GPU acceleration
        willChange: 'transform, opacity',
        animation: isExiting ? 'none' : 'slideInFromRight 0.3s ease-out'
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>

      {/* Message content */}
      <div className="flex-1">
        <div className="font-semibold text-sm mb-1">
          {update.type === 'success' && 'Data Updated Successfully'}
          {update.type === 'info' && 'Data Refreshed'}
          {update.type === 'error' && 'Update Failed'}
        </div>
        <div className="text-xs opacity-90">
          {update.message}
        </div>
      </div>

      {/* Sparkle effect for success (simple pulse) */}
      {update.type === 'success' && (
        <div className="flex-shrink-0 animate-pulse">
          <Sparkles className="w-4 h-4 text-yellow-300" />
        </div>
      )}

      {/* Progress indicator */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl bg-white/30"
        style={{
          animation: `shrinkWidth ${duration}ms linear`,
          transformOrigin: 'left'
        }}
      />
    </div>
  );
}