'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Reusable modal component for add/edit configuration items
 * Follows the glass morphism design of the existing system
 * Features: Form persistence during page refreshes
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
  
  // Generate a unique storage key based on title and mode (add/edit)
  const storageKey = `form_data_${title.replace(/\s+/g, '_')}_${initialData ? 'edit' : 'add'}`;

  // Load persisted form data from sessionStorage
  const loadPersistedData = useCallback(() => {
    try {
      const persisted = sessionStorage.getItem(storageKey);
      if (persisted) {
        return JSON.parse(persisted);
      }
    } catch (error) {
      console.error('Error loading persisted form data:', error);
    }
    return null;
  }, [storageKey]);

  // Save form data to sessionStorage
  const persistFormData = useCallback((data) => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error persisting form data:', error);
    }
  }, [storageKey]);

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing persisted form data:', error);
    }
  }, [storageKey]);

  // Initialize form data
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      // Editing existing item - use initialData
      setFormData(initialData);
      clearPersistedData(); // Clear any persisted data when editing
    } else {
      // Adding new item - try to load persisted data first
      const persisted = loadPersistedData();
      if (persisted) {
        setFormData(persisted);
      } else {
        // No persisted data - set default values
        const defaults = {};
        fields.forEach(field => {
          defaults[field.name] = field.defaultValue || (field.type === 'multi-checkbox' ? [] : '');
        });
        setFormData(defaults);
      }
    }
    setErrors({});
  }, [initialData, isOpen, fields, loadPersistedData, clearPersistedData]);

  if (!isOpen) return null;

  const handleChange = (fieldName, value) => {
    const newFormData = { ...formData, [fieldName]: value };
    setFormData(newFormData);
    
    // Persist form data to sessionStorage (only when adding new items)
    if (!initialData) {
      persistFormData(newFormData);
    }
    
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
      clearPersistedData(); // Clear persisted data on successful save
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  // Handle modal close - optionally clear data
  const handleClose = () => {
    // Don't clear data when closing - keep it for next time
    onClose();
  };

  // Add explicit clear button functionality
  const handleClearForm = () => {
    const defaults = {};
    fields.forEach(field => {
      defaults[field.name] = field.defaultValue || (field.type === 'multi-checkbox' ? [] : '');
    });
    setFormData(defaults);
    clearPersistedData();
    setErrors({});
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
                ? 'bg-white/5 border-white/10 text-white placeholder-white/50 [&>option]:bg-[#0f0f0f] [&>option]:text-white [&>option:hover]:bg-[#1a1a1a]'
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

      case 'multi-checkbox':
        return (
          <div className={`space-y-2 max-h-60 overflow-y-auto p-3 rounded-lg border transition-all duration-700 ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
          }`}>
            {field.options && field.options.length > 0 ? (
              <>
                {/* Select All / Clear All buttons */}
                <div className="flex gap-2 pb-2 border-b border-white/10 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allValues = field.options.map(opt => opt.value);
                      handleChange(field.name, allValues);
                    }}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      isDark
                        ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                    disabled={field.disabled || isLoading}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange(field.name, [])}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      isDark
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                    disabled={field.disabled || isLoading}
                  >
                    Clear All
                  </button>
                </div>
                
                {/* Checkbox options */}
                {field.options.map(option => {
                  const isChecked = Array.isArray(value) && value.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        isDark
                          ? 'hover:bg-white/5'
                          : 'hover:bg-gray-100'
                      } ${field.disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const currentValues = Array.isArray(value) ? value : [];
                          const newValues = e.target.checked
                            ? [...currentValues, option.value]
                            : currentValues.filter(v => v !== option.value);
                          handleChange(field.name, newValues);
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-white/5
                                 text-red-600 focus:ring-red-500/50"
                        disabled={field.disabled || isLoading}
                      />
                      <span className={`text-sm transition-colors duration-700 ${
                        isDark ? 'text-white/80' : 'text-gray-700'
                      }`}>
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </>
            ) : (
              <p className={`text-sm text-center py-4 transition-colors duration-700 ${
                isDark ? 'text-white/50' : 'text-gray-500'
              }`}>
                {field.placeholder || 'No options available'}
              </p>
            )}
          </div>
        );

      case 'password':
        return (
          <input
            type="password"
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
      <div className={`w-full max-w-md max-h-[90vh] border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-700 ${
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
          <div className="space-y-2 pt-4">
            {/* Clear Form button (only show when adding new items) */}
            {!initialData && (
              <button
                type="button"
                onClick={handleClearForm}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded-lg text-sm transition-all duration-300 disabled:opacity-50 ${
                  isDark
                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20'
                    : 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                🔄 Clear Form
              </button>
            )}
            
            {/* Cancel and Submit buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
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
          </div>
        </form>
      </div>
    </div>
  );
}