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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Enhanced styling with black shadows and "smart red" usage
  const inputClasses = `w-full px-4 py-3 rounded-lg transition-all duration-700 ease-smooth backdrop-blur-md outline-none
    ${isDark
      ? 'bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:border-jecrc-red focus:bg-black/60 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
      : 'bg-gray-50 border border-red-100 text-gray-800 placeholder-gray-400 focus:border-jecrc-red focus:bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]'
    }
    ${error ? 'border-red-500 focus:border-red-500' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    focus:ring-2 focus:ring-jecrc-red/20`;

  // Option classes for readability in dropdowns
  const optionClasses = isDark
    ? "bg-gray-900 text-white py-2"
    : "bg-white text-gray-900 py-2";

  return (
    <div className="w-full group">
      <label className={`block text-sm font-bold mb-2 transition-colors duration-700 ease-smooth tracking-wide
        ${isDark ? 'text-gray-300 group-focus-within:text-jecrc-red' : 'text-gray-700 group-focus-within:text-jecrc-red'}`}>
        {label} {required && <span className="text-jecrc-red">*</span>}
      </label>

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
            <option value="" className={optionClasses}>Select {label}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value} className={optionClasses}>
                {option.label}
              </option>
            ))}
          </select>
          {/* Custom dropdown arrow */}
          <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none transition-colors duration-300
            ${isDark ? 'text-gray-400' : 'text-jecrc-red'}`}>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          rows={4}
          className={inputClasses}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}

      {error && (
        <p className="mt-1 text-sm text-red-500 font-medium flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
          {error}
        </p>
      )}
    </div>
  );
}