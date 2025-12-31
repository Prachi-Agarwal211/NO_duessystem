'use client';

import { useTheme } from '@/contexts/ThemeContext';

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
  loading = false
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Modern "Filled" Input Style
  // No border cutting needed. Label floats inside the padding.

  // Modern "Filled" Input Style
  // No border cutting needed. Label floats inside the padding.

  const isTextarea = type === 'textarea';

  return (
    <div className="w-full mb-4">
      {/* Label is now above the input for solid style */}
      <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-slate-500'
        }`}>
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
              className={`
                w-full px-4 py-3 rounded-lg outline-none transition-all duration-200
                font-medium text-sm appearance-none cursor-pointer
                ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
                ${error ? 'border-red-500' : ''}
                ${isDark
                  ? 'bg-white/5 border border-white/10 text-white focus:border-jecrc-red focus:ring-1 focus:ring-jecrc-red'
                  : 'bg-white border border-slate-200 text-slate-900 focus:border-jecrc-red focus:ring-1 focus:ring-jecrc-red'
                }
              `}
            >
              <option value="" disabled>Select {label}</option>
              {options.map((opt, i) => (
                <option key={i} value={opt.value} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-slate-800'}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Custom Arrow */}
            <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
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
            className={`
              w-full px-4 py-3 rounded-lg outline-none transition-all duration-200
              font-medium text-sm resize-none
              ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
              ${error ? 'border-red-500' : ''}
              ${isDark
                ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-jecrc-red focus:ring-1 focus:ring-jecrc-red'
                : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-jecrc-red focus:ring-1 focus:ring-jecrc-red'
              }
            `}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled || loading}
            required={required}
            placeholder={placeholder}
            className={`
              w-full px-4 py-3 rounded-lg outline-none transition-all duration-200
              font-medium text-sm
              ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
              ${error ? 'border-red-500' : ''}
              ${isDark
                ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-jecrc-red focus:ring-1 focus:ring-jecrc-red'
                : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-jecrc-red focus:ring-1 focus:ring-jecrc-red'
              }
            `}
          />
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-500 font-medium flex items-center gap-1 animate-fade-in">
          <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
          {error}
        </p>
      )}
    </div>
  );
}