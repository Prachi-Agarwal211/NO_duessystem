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

  const inputClasses = `w-full px-4 py-3 rounded-lg transition-all duration-700 ease-smooth backdrop-blur-md
    ${isDark 
      ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-jecrc-red focus:bg-white/10' 
      : 'bg-white border border-black/10 text-ink-black placeholder-gray-400 focus:border-jecrc-red focus:bg-gray-50'
    }
    ${error ? 'border-red-500 focus:border-red-500' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    focus:outline-none focus:ring-2 focus:ring-jecrc-red/20`;

  return (
    <div className="w-full">
      <label className={`block text-sm font-medium mb-2 transition-colors duration-700 ease-smooth
        ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        {label} {required && <span className="text-jecrc-red">*</span>}
      </label>
      
      {type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={inputClasses}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}