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
  disabled = false
}) {
  // Modern "Filled" Input Style
  // No border cutting needed. Label floats inside the padding.
  
  const containerClasses = `
    relative w-full rounded-t-lg overflow-hidden transition-colors duration-300
    bg-gray-50/50 dark:bg-white/5 border-b-2 
    ${error ? 'border-red-500' : 'border-gray-200 dark:border-white/20'}
    focus-within:border-jecrc-red dark:focus-within:border-jecrc-red
    hover:bg-gray-100 dark:hover:bg-white/10
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;

  const inputClasses = `
    peer w-full px-4 pt-6 pb-2 bg-transparent outline-none border-none
    text-gray-900 dark:text-white placeholder-transparent
    disabled:cursor-not-allowed
  `;

  // Label logic: 
  // If value is present or input is focused, label floats to top.
  // Otherwise, it sits in the middle.
  const labelClasses = `
    absolute left-4 transition-all duration-300 pointer-events-none origin-top-left
    ${value 
      ? 'top-1 text-xs text-jecrc-red font-medium'
      : 'top-4 text-base text-gray-500 dark:text-gray-400 peer-focus:top-1 peer-focus:text-xs peer-focus:text-jecrc-red peer-placeholder-shown:top-4 peer-placeholder-shown:text-base'
    }
  `;

  return (
    <div className="w-full group relative mb-4">
      <div className={containerClasses}>
        {type === 'select' ? (
          <div className="relative">
            <select
              name={name}
              value={value}
              onChange={onChange}
              required={required}
              disabled={disabled}
              className={`${inputClasses} appearance-none cursor-pointer`}
            >
              <option value="" disabled></option>
              {options.map((option) => (
                <option key={option.value} value={option.value} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  {option.label}
                </option>
              ))}
            </select>
            <label className={labelClasses}>
              {label} {required && <span className="text-jecrc-red">*</span>}
            </label>
            
            {/* Custom dropdown arrow */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 peer-focus:text-jecrc-red transition-colors">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1.5L6 6.5L11 1.5" />
              </svg>
            </div>
          </div>
        ) : type === 'textarea' ? (
          <div className="relative">
            <textarea
              name={name}
              value={value}
              onChange={onChange}
              required={required}
              disabled={disabled}
              placeholder={placeholder} // For floating label to work with placeholder-shown
              rows={4}
              className={`${inputClasses} resize-none`}
            />
            <label className={labelClasses}>
              {label} {required && <span className="text-jecrc-red">*</span>}
            </label>
          </div>
        ) : (
          <div className="relative">
            <input
              type={type}
              name={name}
              value={value}
              onChange={onChange}
              required={required}
              disabled={disabled}
              placeholder={placeholder || " "} // Placeholder required for CSS-only floating label
              className={inputClasses}
            />
            <label className={labelClasses}>
              {label} {required && <span className="text-jecrc-red">*</span>}
            </label>
          </div>
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