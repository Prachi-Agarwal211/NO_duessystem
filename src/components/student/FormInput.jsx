'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';

export default function FormInput({
  label,
  name,
  type = 'text',
  value = '',
  onChange,
  required = false,
  placeholder = '',
  disabled = false,
  options = [],
  ...props
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  
  // Determine if label should float
  const shouldFloat = isFocused || value !== '' || type === 'select';
  
  const isSelect = type === 'select';

  return (
    <div className="relative w-full">
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
        <select
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          required={required}
          className={`
            w-full rounded-lg border px-3 pt-6 pb-2 outline-none
            font-sans text-sm
            transition-all duration-300 ease-spring
            ${isDark
              ? `
                border-white/20 bg-black/80 text-white
                focus:border-jecrc-red-bright focus:shadow-neon-red
                hover:border-white/30
                disabled:opacity-50 disabled:cursor-not-allowed
              `
              : `
                bg-white/90 text-black border-gray-300
                focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20 focus:bg-white
                focus:shadow-sharp-black
                hover:border-gray-400
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `
            }
            ${isFocused ? 'scale-[1.01]' : 'scale-100'}
          `}
          style={{
            willChange: 'transform, box-shadow',
            transform: 'translateZ(0)'
          }}
          {...props}
        >
          <option value="" disabled>
            Select {label}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
          whileFocus={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`
            w-full rounded-lg border px-3 pt-6 pb-2 outline-none
            font-sans text-sm
            transition-all duration-300 ease-spring
            ${isDark
              ? `
                border-white/20 bg-black/80 text-white placeholder-white/30
                focus:border-jecrc-red-bright focus:shadow-neon-red
                hover:border-white/30
                disabled:opacity-50 disabled:cursor-not-allowed
              `
              : `
                bg-white/90 text-black placeholder-gray-400 border-gray-300
                focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20 focus:bg-white
                focus:shadow-sharp-black
                hover:border-gray-400
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `
            }
          `}
          style={{
            willChange: 'transform, box-shadow',
            transform: 'translateZ(0)'
          }}
          {...props}
        />
      )}

      {/* Focus Ring Animation */}
      {isFocused && (
        <motion.div
          layoutId={`focus-ring-${name}`}
          className={`
            absolute inset-0 rounded-lg pointer-events-none -z-10
            ${isDark ? 'bg-jecrc-red/5' : 'bg-jecrc-red/5'}
          `}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </div>
  );
}