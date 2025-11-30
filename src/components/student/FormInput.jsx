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
  // Modern "Floating Label" effect logic
  // If there is a value, or if the input is focused (handled by CSS peer-focus), the label floats up.
  
  const baseInputClasses = `
    peer w-full px-4 py-3 rounded-lg outline-none transition-all duration-300
    bg-white/50 dark:bg-black/40 backdrop-blur-md
    border border-gray-200 dark:border-white/10
    text-gray-900 dark:text-white placeholder-transparent
    focus:border-jecrc-red dark:focus:border-jecrc-red
    focus:ring-2 focus:ring-jecrc-red/20
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const labelBaseClasses = "absolute left-4 transition-all duration-300 pointer-events-none";
  const floatingClasses = "-top-2.5 text-xs text-jecrc-red bg-white dark:bg-black px-1";
  const restingClasses = "top-3.5 text-base text-gray-500 dark:text-gray-400";

  const finalLabelClasses = value
    ? `${labelBaseClasses} ${floatingClasses}`
    : `${labelBaseClasses} ${restingClasses} 
       peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-jecrc-red peer-focus:bg-white peer-focus:dark:bg-black peer-focus:px-1
       peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:dark:text-gray-400`;

  return (
    <div className="w-full group relative mb-4">
      {type === 'select' ? (
        <div className="relative">
          <select
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className={`${baseInputClasses} appearance-none cursor-pointer pt-3.5 pb-2.5`}
          >
            <option value="" disabled></option>
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                {option.label}
              </option>
            ))}
          </select>
          <label className={finalLabelClasses}>
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
            className={`${baseInputClasses} resize-none`}
          />
          <label className={finalLabelClasses}>
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
            className={baseInputClasses}
          />
          <label className={finalLabelClasses}>
            {label} {required && <span className="text-jecrc-red">*</span>}
          </label>
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-500 font-medium flex items-center gap-1 animate-fade-in">
          <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
          {error}
        </p>
      )}
    </div>
  );
}