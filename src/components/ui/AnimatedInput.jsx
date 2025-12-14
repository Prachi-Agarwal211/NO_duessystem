'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * AnimatedInput Component
 * 
 * Input field with floating label animation and focus effects.
 * Features:
 * - Floating label that moves up when focused/filled
 * - Focus ring with scale animation
 * - Border glow effect on focus
 * - Theme-aware styling
 * - Error state with shake animation
 * - GPU-accelerated animations
 * 
 * @param {Object} props
 * @param {string} props.label - Input label text
 * @param {string} props.type - Input type (text, email, password, etc.)
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.error - Error message
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Whether field is required
 * @param {boolean} props.disabled - Whether field is disabled
 * @param {string} props.icon - Icon component (optional)
 * @param {string} props.className - Additional CSS classes
 */
export default function AnimatedInput({
  label,
  type = 'text',
  value = '',
  onChange,
  error = '',
  placeholder = '',
  required = false,
  disabled = false,
  icon: Icon = null,
  className = '',
  ...props
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const isFloating = isFocused || value || placeholder;
  
  // Trigger shake animation on error
  React.useEffect(() => {
    if (error) {
      setHasError(true);
      const timer = setTimeout(() => setHasError(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  return (
    <div className={`relative ${className}`}>
      {/* Input Container with Focus Ring */}
      <motion.div
        animate={{
          scale: isFocused ? 1.01 : 1,
          x: hasError ? [-2, 2, -2, 2, 0] : 0
        }}
        transition={{
          scale: { duration: 0.2 },
          x: { duration: 0.4 }
        }}
        className="relative"
      >
        {/* Focus Glow Effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isFocused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className={`absolute inset-0 rounded-lg blur-sm -z-10 ${
            error
              ? 'bg-red-500/20'
              : isDark
              ? 'bg-jecrc-red/20'
              : 'bg-jecrc-red/10'
          }`}
        />
        
        {/* Input Field */}
        <div className="relative">
          {/* Icon */}
          {Icon && (
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          
          {/* Input */}
          <input
            type={type}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            className={`
              w-full px-4 py-3 rounded-lg outline-none transition-all duration-200
              ${Icon ? 'pl-11' : 'pl-4'}
              ${error ? 'border-2 border-red-500' : 'border-2'}
              ${
                isDark
                  ? `bg-white/5 text-white border-white/10 
                     focus:border-jecrc-red focus:bg-white/10
                     disabled:bg-white/5 disabled:text-gray-500`
                  : `bg-white text-gray-900 border-gray-200 
                     focus:border-jecrc-red focus:bg-white
                     disabled:bg-gray-100 disabled:text-gray-400`
              }
            `}
            {...props}
          />
          
          {/* Floating Label */}
          {label && (
            <motion.label
              initial={false}
              animate={{
                y: isFloating ? -32 : 0,
                scale: isFloating ? 0.85 : 1,
                x: isFloating ? (Icon ? -32 : 0) : 0
              }}
              transition={{
                duration: 0.2,
                ease: [0.22, 1, 0.36, 1]
              }}
              className={`
                absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none
                font-medium origin-left
                ${Icon && !isFloating ? 'left-11' : 'left-4'}
                ${
                  error
                    ? 'text-red-500'
                    : isDark
                    ? isFloating
                      ? 'text-jecrc-red'
                      : 'text-gray-400'
                    : isFloating
                    ? 'text-jecrc-red'
                    : 'text-gray-500'
                }
              `}
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </motion.label>
          )}
        </div>
      </motion.div>
      
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-red-500 mt-1 ml-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * AnimatedTextarea Component
 * 
 * Textarea with similar animations to AnimatedInput.
 */
export function AnimatedTextarea({
  label,
  value = '',
  onChange,
  error = '',
  placeholder = '',
  required = false,
  disabled = false,
  rows = 4,
  className = '',
  ...props
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const isFloating = isFocused || value || placeholder;
  
  React.useEffect(() => {
    if (error) {
      setHasError(true);
      const timer = setTimeout(() => setHasError(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  return (
    <div className={`relative ${className}`}>
      <motion.div
        animate={{
          scale: isFocused ? 1.01 : 1,
          x: hasError ? [-2, 2, -2, 2, 0] : 0
        }}
        transition={{
          scale: { duration: 0.2 },
          x: { duration: 0.4 }
        }}
        className="relative"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isFocused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className={`absolute inset-0 rounded-lg blur-sm -z-10 ${
            error
              ? 'bg-red-500/20'
              : isDark
              ? 'bg-jecrc-red/20'
              : 'bg-jecrc-red/10'
          }`}
        />
        
        <div className="relative">
          <textarea
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            rows={rows}
            className={`
              w-full px-4 py-3 rounded-lg outline-none transition-all duration-200 resize-none
              ${error ? 'border-2 border-red-500' : 'border-2'}
              ${
                isDark
                  ? `bg-white/5 text-white border-white/10 
                     focus:border-jecrc-red focus:bg-white/10
                     disabled:bg-white/5 disabled:text-gray-500`
                  : `bg-white text-gray-900 border-gray-200 
                     focus:border-jecrc-red focus:bg-white
                     disabled:bg-gray-100 disabled:text-gray-400`
              }
            `}
            {...props}
          />
          
          {label && (
            <motion.label
              initial={false}
              animate={{
                y: isFloating ? -32 : 12,
                scale: isFloating ? 0.85 : 1
              }}
              transition={{
                duration: 0.2,
                ease: [0.22, 1, 0.36, 1]
              }}
              className={`
                absolute left-4 top-0 pointer-events-none
                font-medium origin-left
                ${
                  error
                    ? 'text-red-500'
                    : isDark
                    ? isFloating
                      ? 'text-jecrc-red'
                      : 'text-gray-400'
                    : isFloating
                    ? 'text-jecrc-red'
                    : 'text-gray-500'
                }
              `}
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </motion.label>
          )}
        </div>
      </motion.div>
      
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-red-500 mt-1 ml-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * AnimatedSelect Component
 * 
 * Select dropdown with floating label and focus animations.
 */
export function AnimatedSelect({
  label,
  value = '',
  onChange,
  options = [],
  error = '',
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const isFloating = isFocused || value;
  
  React.useEffect(() => {
    if (error) {
      setHasError(true);
      const timer = setTimeout(() => setHasError(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  return (
    <div className={`relative ${className}`}>
      <motion.div
        animate={{
          scale: isFocused ? 1.01 : 1,
          x: hasError ? [-2, 2, -2, 2, 0] : 0
        }}
        transition={{
          scale: { duration: 0.2 },
          x: { duration: 0.4 }
        }}
        className="relative"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isFocused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className={`absolute inset-0 rounded-lg blur-sm -z-10 ${
            error
              ? 'bg-red-500/20'
              : isDark
              ? 'bg-jecrc-red/20'
              : 'bg-jecrc-red/10'
          }`}
        />
        
        <div className="relative">
          <select
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            className={`
              w-full px-4 py-3 rounded-lg outline-none transition-all duration-200 appearance-none cursor-pointer
              ${error ? 'border-2 border-red-500' : 'border-2'}
              ${
                isDark
                  ? `bg-white/5 text-white border-white/10
                     focus:border-jecrc-red focus:bg-white/10
                     disabled:bg-white/5 disabled:text-gray-500
                     [&>option]:bg-[#0f0f0f] [&>option]:text-white [&>option:hover]:bg-[#1a1a1a]`
                  : `bg-white text-gray-900 border-gray-200
                     focus:border-jecrc-red focus:bg-white
                     disabled:bg-gray-100 disabled:text-gray-400`
              }
            `}
            {...props}
          >
            <option value="" disabled>
              Select...
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Dropdown Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {label && (
            <motion.label
              initial={false}
              animate={{
                y: isFloating ? -32 : 0,
                scale: isFloating ? 0.85 : 1
              }}
              transition={{
                duration: 0.2,
                ease: [0.22, 1, 0.36, 1]
              }}
              className={`
                absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none
                font-medium origin-left
                ${
                  error
                    ? 'text-red-500'
                    : isDark
                    ? isFloating
                      ? 'text-jecrc-red'
                      : 'text-gray-400'
                    : isFloating
                    ? 'text-jecrc-red'
                    : 'text-gray-500'
                }
              `}
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </motion.label>
          )}
        </div>
      </motion.div>
      
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-red-500 mt-1 ml-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}