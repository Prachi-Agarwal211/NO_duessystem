'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function CreativeRefreshButton({
  onRefresh,
  loading = false,
  variant = 'primary', // primary, secondary, success
  size = 'md', // sm, md, lg
  className = '',
  ...props
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [refreshState, setRefreshState] = useState('idle'); // idle, refreshing, success

  const handleRefresh = async () => {
    setRefreshState('refreshing');
    await onRefresh();
    
    // Show success animation
    setRefreshState('success');
    setTimeout(() => setRefreshState('idle'), 1500);
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const variantClasses = {
    primary: isDark
      ? 'bg-gradient-to-r from-jecrc-red to-pink-500 hover:from-jecrc-red/80 hover:to-pink-500/80'
      : 'bg-gradient-to-r from-jecrc-red to-rose-500 hover:from-jecrc-red/90 hover:to-rose-500/90',
    secondary: isDark
      ? 'bg-white/10 hover:bg-white/20 border-white/30'
      : 'bg-gray-100 hover:bg-gray-200 border-gray-300',
    success: isDark
      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
      : 'bg-gradient-to-r from-green-500 to-emerald-500'
  };

  return (
    <motion.button
      className={`
        relative overflow-hidden rounded-xl font-medium text-white
        ${sizeClasses[size]} ${variantClasses[variant]}
        ${loading || refreshState === 'refreshing' ? 'cursor-waiting' : 'cursor-pointer'}
        transition-all duration-300 transform-gpu
        ${className}
      `}
      onClick={handleRefresh}
      disabled={loading || refreshState === 'refreshing'}
      whileHover={!loading && refreshState === 'idle' ? { scale: 1.05 } : {}}
      whileTap={!loading && refreshState === 'idle' ? { scale: 0.95 } : {}}
      {...props}
    >
      {/* Animated gradient shimmer on refresh */}
      {!loading && refreshState === 'idle' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      )}

      {/* Content changes based on state */}
      <span className="relative z-10 flex items-center justify-center">
        {refreshState === 'refreshing' || loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full flex items-center justify-center"
          >
            <RefreshCw className="w-1/2 h-1/2" />
          </motion.div>
        ) : refreshState === 'success' ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="w-full h-full flex items-center justify-center"
          >
            <CheckCircle className="w-1/2 h-1/2" />
          </motion.div>
        ) : (
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full h-full flex items-center justify-center"
          >
            <RefreshCw className="w-1/2 h-1/2" />
          </motion.div>
        )}
      </span>

      {/* Success burst animation */}
      {refreshState === 'success' && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5 }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
              style={{
                top: '50%',
                left: '50%',
              }}
              initial={{ 
                scale: 0,
                x: '0%',
                y: '0%',
                opacity: 0
              }}
              animate={{
                scale: [0, 1.5, 0],
                x: `${Math.cos((i * 60) * Math.PI / 180) * 100}%`,
                y: `${Math.sin((i * 60) * Math.PI / 180) * 100}%`,
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
                ease: 'easeOut'
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Loading ring animation */}
      {loading && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2"
          style={{
            borderColor: isDark ? 'rgba(196, 30, 58, 0.5)' : 'rgba(196, 30, 58, 0.3)'
          }}
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
            scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' }
          }}
        />
      )}
    </motion.button>
  );
}