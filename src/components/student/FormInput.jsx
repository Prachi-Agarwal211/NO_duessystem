'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  required = false,
  error = '',
  placeholder = '',
  options = [], // For select inputs
  disabled = false,
  loading = false,
  theme = 'jecrc',
  floatingLabel = true
}) {
  const { theme: currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const isTextarea = type === 'textarea';

  // Theme-based styling
  const getThemeClasses = () => {
    switch (theme) {
      case 'corporate':
        return {
          border: isDark ? 'border-blue-500/30' : 'border-blue-500/30',
          focus: isDark ? 'focus:border-blue-400 focus:ring-blue-400/30' : 'focus:border-blue-600 focus:ring-blue-600/30',
          hover: isDark ? 'hover:border-blue-400/50' : 'hover:border-blue-600/50'
        };
      case 'executive':
        return {
          border: isDark ? 'border-purple-500/30' : 'border-purple-500/30',
          focus: isDark ? 'focus:border-purple-400 focus:ring-purple-400/30' : 'focus:border-purple-600 focus:ring-purple-600/30',
          hover: isDark ? 'hover:border-purple-400/50' : 'hover:border-purple-600/50'
        };
      case 'professional':
        return {
          border: isDark ? 'border-cyan-500/30' : 'border-cyan-500/30',
          focus: isDark ? 'focus:border-cyan-400 focus:ring-cyan-400/30' : 'focus:border-cyan-600 focus:ring-cyan-600/30',
          hover: isDark ? 'hover:border-cyan-400/50' : 'hover:border-cyan-600/50'
        };
      case 'jecrc':
      default:
        return {
          border: isDark ? 'border-red-500/30' : 'border-red-500/30',
          focus: isDark ? 'focus:border-red-400 focus:ring-red-400/30' : 'focus:border-red-600 focus:ring-red-600/30',
          hover: isDark ? 'hover:border-red-400/50' : 'hover:border-red-600/50'
        };
    }
  };

  const themeClasses = getThemeClasses();

  return (
    <div className="w-full mb-4 sm:mb-5">
      {/* Label - Premium Style */}
      <label className={`
        block text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 sm:mb-3
        ${isDark ? 'text-gray-400' : 'text-gray-600'}
        ${floatingLabel ? 'absolute left-4 -top-2 bg-transparent px-1 text-xs' : ''}
      `}>
        {label} {required && <span className="text-jecrc-red">*</span>}
      </label>

      <div className="relative">
        {type === 'select' ? (
          <div className="relative">
            <select
              name={name}
              value={value}
              onChange={onChange}
              required={required}
              disabled={disabled || loading}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`
                w-full px-4 py-3 sm:py-3.5 rounded-xl outline-none transition-all duration-300
                font-medium text-sm appearance-none cursor-pointer
                ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
                ${error ? 'border-red-500' : ''}
                ${isDark
                  ? 'bg-white/5 border border-white/10 text-white hover:border-jecrc-red/30 focus:border-jecrc-red focus:ring-2 focus:ring-red-600/30'
                  : 'bg-white border border-gray-200 text-gray-900 hover:border-jecrc-red/50 focus:border-jecrc-red focus:ring-2 focus:ring-red-600/30'
                }
                ${themeClasses.border} ${themeClasses.focus} ${themeClasses.hover}
              `}
            >
              <option value="" disabled>Select {label}</option>
              {options.map((opt, i) => (
                <option key={i} value={opt.value} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Custom Arrow - Premium Style */}
            <div className={`
              absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none
              ${isDark ? 'text-gray-500' : 'text-gray-400'}
            `}>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1L5 5L9 1" />
              </svg>
            </div>
          </div>
        ) : isTextarea ? (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled || loading}
            required={required}
            placeholder={placeholder}
            rows={4}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
              w-full px-4 py-3 sm:py-3.5 rounded-xl outline-none transition-all duration-300
              font-medium text-sm resize-none
              ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
              ${error ? 'border-red-500' : ''}
              ${isDark
                ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 hover:border-jecrc-red/30 focus:border-jecrc-red focus:ring-2 focus:ring-red-600/30'
                : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 hover:border-jecrc-red/50 focus:border-jecrc-red focus:ring-2 focus:ring-red-600/30'
              }
              ${themeClasses.border} ${themeClasses.focus} ${themeClasses.hover}
            `}
          />
        ) : (
          <div className="relative">
            <input
              type={inputType}
              name={name}
              value={value}
              onChange={onChange}
              disabled={disabled || loading}
              required={required}
              placeholder={placeholder}
              inputMode={type === 'tel' ? 'tel' : type === 'number' ? 'numeric' : undefined}
              autoComplete={type === 'tel' ? 'tel' : type === 'email' ? 'email' : undefined}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`
                w-full px-4 py-3 sm:py-3.5 rounded-xl outline-none transition-all duration-300
                font-medium text-sm
                ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
                ${error ? 'border-red-500' : ''}
                ${isDark
                  ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 hover:border-jecrc-red/30 focus:border-jecrc-red focus:ring-2 focus:ring-red-600/30'
                  : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 hover:border-jecrc-red/50 focus:border-jecrc-red focus:ring-2 focus:ring-red-600/30'
                }
                ${themeClasses.border} ${themeClasses.focus} ${themeClasses.hover}
              `}
            />
            
            {/* Password Toggle Button */}
            {type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={disabled || loading}
              >
                {showPassword ? (
                  <EyeOff className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                  <Eye className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-500 font-medium flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}
