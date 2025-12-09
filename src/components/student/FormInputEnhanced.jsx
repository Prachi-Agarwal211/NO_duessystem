'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { dropdownAnimation, hoverLift, tapScale } from '@/lib/animationUtils';
import { shadows, gradients } from '@/lib/visualStyles';

export default function FormInputEnhanced({
  label,
  name,
  type = 'text',
  value = '',
  onChange,
  required = false,
  placeholder = '',
  disabled = false,
  loading = false,
  error = null,
  options = [],
  ...props
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  
  const shouldFloat = isFocused || value !== '' || type === 'select';
  const isSelect = type === 'select';
  const isTextarea = type === 'textarea';
  const hasOptions = options && options.length > 0;

  // Dynamic styles based on state
  const getContainerStyle = () => {
    let boxShadow = isDark ? shadows.xs : shadows.xs;
    
    if (error) {
      boxShadow = isDark ? shadows.neon.red : shadows.red.sm;
    } else if (isFocused) {
      boxShadow = isDark ? shadows.neon.red : shadows.red.md;
    } else if (!disabled) {
      boxShadow = isDark ? shadows.sm : shadows.xs;
    }
    
    return { boxShadow };
  };

  return (
    <motion.div 
      className="relative w-full"
      initial={dropdownAnimation.initial}
      animate={dropdownAnimation.animate}
    >
      {/* Floating Label */}
      <motion.label
        initial={false}
        animate={{
          top: shouldFloat ? '0.25rem' : '0.75rem',
          fontSize: shouldFloat ? '0.75rem' : '0.875rem',
          opacity: shouldFloat ? 1 : 0.6,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        className={`
          absolute left-3 z-10 px-1 pointer-events-none
          font-medium transition-colors duration-300
          ${shouldFloat 
            ? isDark 
              ? 'text-jecrc-red-bright' 
              : 'text-jecrc-red'
            : isDark
              ? 'text-gray-400'
              : 'text-gray-500'
          }
          ${shouldFloat && (isDark ? 'bg-black' : 'bg-white')}
        `}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </motion.label>

      {/* Input/Select Field */}
      {isSelect ? (
        <motion.select
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled || loading}
          required={required}
          whileHover={!disabled && !loading ? { y: -1 } : {}}
          whileTap={!disabled && !loading ? tapScale : {}}
          style={{
            colorScheme: isDark ? 'dark' : 'light',
            ...getContainerStyle()
          }}
          className={`
            w-full rounded-lg border px-3 pt-6 pb-2 outline-none
            font-sans text-sm cursor-pointer
            transition-all duration-300 ease-out
            backdrop-blur-sm
            ${isDark
              ? `
                border-white/20 bg-black/80 text-white
                focus:border-jecrc-red-bright
                hover:border-white/30 hover:bg-black/90
                disabled:opacity-50 disabled:cursor-not-allowed
                [&>option]:bg-black [&>option]:text-white
              `
              : `
                bg-white/90 text-black border-gray-300
                focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20 focus:bg-white
                hover:border-gray-400 hover:bg-white
                disabled:bg-gray-100 disabled:cursor-not-allowed
                [&>option]:bg-white [&>option]:text-black
              `
            }
            ${error ? (isDark ? 'border-red-500/50' : 'border-red-500') : ''}
          `}
          {...props}
        >
          <option value="" disabled>
            {loading 
              ? 'Loading...' 
              : !hasOptions 
                ? (placeholder || `No ${label.toLowerCase()} available`)
                : (placeholder || `Select ${label}`)
            }
          </option>
          {hasOptions && options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </motion.select>
      ) : isTextarea ? (
        <motion.textarea
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          required={required}
          placeholder={isFocused ? placeholder : ''}
          rows={4}
          whileHover={!disabled ? { y: -1 } : {}}
          style={getContainerStyle()}
          className={`
            w-full rounded-lg border px-3 pt-6 pb-2 outline-none
            font-sans text-sm resize-none
            transition-all duration-300 ease-out
            backdrop-blur-sm
            ${isDark
              ? `
                border-white/20 bg-black/80 text-white placeholder-white/30
                focus:border-jecrc-red-bright
                hover:border-white/30 hover:bg-black/90
                disabled:opacity-50 disabled:cursor-not-allowed
              `
              : `
                bg-white/90 text-black placeholder-gray-400 border-gray-300
                focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20 focus:bg-white
                hover:border-gray-400 hover:bg-white
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `
            }
          `}
          {...props}
        />
      ) : (
        <motion.input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          required={required}
          placeholder={isFocused ? placeholder : ''}
          whileFocus={{ scale: 1.005 }}
          whileHover={!disabled ? { y: -1 } : {}}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={getContainerStyle()}
          className={`
            w-full rounded-lg border px-3 pt-6 pb-2 outline-none
            font-sans text-sm
            transition-all duration-300 ease-out
            backdrop-blur-sm
            ${isDark
              ? `
                border-white/20 bg-black/80 text-white placeholder-white/30
                focus:border-jecrc-red-bright
                hover:border-white/30 hover:bg-black/90
                disabled:opacity-50 disabled:cursor-not-allowed
              `
              : `
                bg-white/90 text-black placeholder-gray-400 border-gray-300
                focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20 focus:bg-white
                hover:border-gray-400 hover:bg-white
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `
            }
          `}
          {...props}
        />
      )}

      {/* Animated Error Message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5, x: [0, -5, 5, -5, 5, 0] }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ 
              opacity: { duration: 0.2 },
              y: { duration: 0.2 },
              x: { duration: 0.4 }
            }}
            className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}
          >
            <motion.span 
              className="inline-block w-1 h-1 rounded-full bg-current"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Focus Ring Animation with Gradient Glow */}
      <AnimatePresence>
        {isFocused && !error && (
          <motion.div
            layoutId={`focus-ring-${name}`}
            className={`
              absolute inset-0 rounded-lg pointer-events-none -z-10
            `}
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.1) 100%)',
              boxShadow: isDark ? shadows.neon.red : shadows.red.sm
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Error Ring with Shake Animation */}
      <AnimatePresence>
        {error && (
          <motion.div
            className={`
              absolute inset-0 rounded-lg pointer-events-none -z-10
            `}
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.1) 100%)',
              boxShadow: isDark ? shadows.neon.red : shadows.red.sm
            }}
            initial={{ opacity: 0, x: 0 }}
            animate={{ 
              opacity: 1,
              x: [0, -3, 3, -3, 3, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              opacity: { duration: 0.2 },
              x: { duration: 0.4 }
            }}
          />
        )}
      </AnimatePresence>

      {/* Loading Shimmer Effect */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`
                absolute inset-0 bg-gradient-to-r
                ${isDark 
                  ? 'from-transparent via-white/10 to-transparent' 
                  : 'from-transparent via-gray-200/50 to-transparent'
                }
              `}
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}