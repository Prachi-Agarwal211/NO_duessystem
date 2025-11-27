'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Reusable modal component for add/edit configuration items
 * Follows the glass morphism design of the existing system
 */
export default function ConfigModal({
  isOpen,
  onClose,
  onSave,
  title,
  fields = [],
  initialData = null,
  isLoading = false
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Set default values for all fields
      const defaults = {};
      fields.forEach(field => {
        defaults[field.name] = field.defaultValue || '';
      });
      setFormData(defaults);
    }
    setErrors({});
  }, [initialData, fields, isOpen]);

  if (!isOpen) return null;

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.validate) {
        const error = field.validate(formData[field.name], formData);
        if (error) newErrors[field.name] = error;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];

    switch (field.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500/50 transition-all duration-700 ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-white/50'
                : 'bg-white border-gray-300 text-ink-black'
            }`}
            disabled={field.disabled || isLoading}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500/50 transition-all duration-700 ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-white/50'
                : 'bg-white border-gray-300 text-ink-black placeholder-gray-500'
            }`}
            disabled={field.disabled || isLoading}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500/50 transition-all duration-700 ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-white/50'
                : 'bg-white border-gray-300 text-ink-black placeholder-gray-500'
            }`}
            disabled={field.disabled || isLoading}
          />
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleChange(field.name, e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/5 
                     text-red-600 focus:ring-red-500/50"
            disabled={field.disabled || isLoading}
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500/50 transition-all duration-700 ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-white/50'
                : 'bg-white border-gray-300 text-ink-black placeholder-gray-500'
            }`}
            disabled={field.disabled || isLoading}
          />
        );
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-colors duration-700 ${
      isDark ? 'bg-black/60' : 'bg-black/40'
    }`}>
      <div className={`w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden transition-all duration-700 ${
        isDark
          ? 'bg-black/40 backdrop-blur-xl border-white/10'
          : 'bg-white border-gray-300'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b transition-colors duration-700 ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <h3 className={`text-xl font-bold transition-colors duration-700 ${
            isDark ? 'text-white' : 'text-ink-black'
          }`}>
            {title}
          </h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map(field => (
            <div key={field.name}>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-700 ${
                isDark ? 'text-white/80' : 'text-gray-700'
              }`}>
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              
              {field.type === 'checkbox' ? (
                <div className="flex items-center gap-2">
                  {renderField(field)}
                  {field.helpText && (
                    <span className={`text-xs transition-colors duration-700 ${
                      isDark ? 'text-white/50' : 'text-gray-500'
                    }`}>
                      {field.helpText}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  {renderField(field)}
                  {field.helpText && (
                    <p className={`mt-1 text-xs transition-colors duration-700 ${
                      isDark ? 'text-white/50' : 'text-gray-500'
                    }`}>
                      {field.helpText}
                    </p>
                  )}
                </>
              )}
              
              {errors[field.name] && (
                <p className="mt-1 text-xs text-red-400">{errors[field.name]}</p>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 border rounded-lg transition-all duration-300 disabled:opacity-50 ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 
                       rounded-lg text-white font-medium hover:from-red-700 hover:to-red-800
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : initialData ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}