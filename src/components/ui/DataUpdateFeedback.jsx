'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function DataUpdateFeedback({ 
  updates = [], 
  duration = 3000 
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      {updates.map((update, index) => (
        <motion.div
          key={`${update.type}-${update.id}`}
          className="fixed top-4 right-4 z-50 pointer-events-none"
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ duration: 0.3, type: 'spring' }}
          style={{
            marginTop: `${index * 60}px` // Stack multiple notifications
          }}
        >
          <motion.div
            className={`
              px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border
              flex items-center gap-3 min-w-[300px]
              ${update.type === 'success' 
                ? isDark 
                  ? 'bg-green-500/90 border-green-500/30 text-green-100'
                  : 'bg-green-500/95 border-green-500/20 text-white'
                : update.type === 'info'
                  ? isDark
                    ? 'bg-blue-500/90 border-blue-500/30 text-blue-100'
                    : 'bg-blue-500/95 border-blue-500/20 text-white'
                  : isDark
                    ? 'bg-red-500/90 border-red-500/30 text-red-100'
                    : 'bg-red-500/95 border-red-500/20 text-white'
              }
            `}
            animate={{
              scale: [0.95, 1.02, 0.95]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            {/* Icon based on type */}
            <motion.div
              animate={{
                rotate: update.type === 'success' ? [0, 10, 0] : [0, 5, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              {update.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {update.type === 'info' && <TrendingUp className="w-5 h-5" />}
              {update.type === 'error' && <AlertCircle className="w-5 h-5" />}
            </motion.div>

            {/* Message content */}
            <div className="flex-1">
              <div className="font-semibold text-sm mb-1">
                {update.type === 'success' && 'Data Updated Successfully'}
                {update.type === 'info' && 'Data Refreshed'}
                {update.type === 'error' && 'Update Failed'}
              </div>
              <div className="text-xs opacity-80">
                {update.message}
              </div>
            </div>

            {/* Sparkle effects for success */}
            {update.type === 'success' && (
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{
                  rotate: 360,
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                  opacity: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                }}
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </motion.div>
            )}

            {/* Progress indicator */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(196,30,58,0.3)'
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}