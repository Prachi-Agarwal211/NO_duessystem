'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertCircle } from 'lucide-react';

/**
 * AutoSaveIndicator Component
 * 
 * Displays a subtle indicator showing the auto-save status of form data.
 * Features:
 * - Three states: saving, saved, error
 * - Smooth fade in/out animations
 * - Minimal, non-intrusive design
 * - Theme-aware styling
 * - Auto-hide after 2 seconds when saved
 * 
 * @param {Object} props
 * @param {string} props.status - Status: 'saving', 'saved', 'error', null (hidden)
 * @param {string} props.errorMessage - Error message to display when status is 'error'
 * @param {boolean} props.isDark - Theme mode
 */
export default function AutoSaveIndicator({ status = null, errorMessage = 'Failed to save', isDark = false }) {
  // Don't render if no status
  if (!status) return null;
  
  // Status configurations
  const statusConfig = {
    saving: {
      icon: Loader2,
      text: 'Saving draft...',
      color: isDark ? 'text-blue-400' : 'text-blue-600',
      bgColor: isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200',
      spin: true
    },
    saved: {
      icon: Check,
      text: 'Draft saved',
      color: isDark ? 'text-green-400' : 'text-green-600',
      bgColor: isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200',
      spin: false
    },
    error: {
      icon: AlertCircle,
      text: errorMessage,
      color: isDark ? 'text-red-400' : 'text-red-600',
      bgColor: isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200',
      spin: false
    }
  };
  
  const config = statusConfig[status] || statusConfig.saving;
  const Icon = config.icon;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`
          fixed top-4 right-4 z-40
          flex items-center gap-2 px-4 py-2 rounded-lg border
          ${config.bgColor}
          shadow-lg backdrop-blur-sm
        `}
      >
        <Icon 
          className={`w-4 h-4 ${config.color} ${config.spin ? 'animate-spin' : ''}`}
        />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * useAutoSave Hook
 * 
 * Custom hook to handle auto-saving form data to localStorage.
 * Features:
 * - Debounced saving (waits for user to stop typing)
 * - Automatic status updates
 * - localStorage persistence
 * - Draft restoration on page load
 * - Cleanup on successful submission
 * 
 * Usage:
 * ```jsx
 * const { saveStatus, saveDraft, loadDraft, clearDraft } = useAutoSave('formKey');
 * 
 * useEffect(() => {
 *   saveDraft(formData);
 * }, [formData]);
 * 
 * useEffect(() => {
 *   const draft = loadDraft();
 *   if (draft) setFormData(draft);
 * }, []);
 * ```
 */
export function useAutoSave(storageKey, debounceMs = 1000) {
  const [saveStatus, setSaveStatus] = React.useState(null);
  const saveTimerRef = React.useRef(null);
  const hideTimerRef = React.useRef(null);
  
  // Save draft to localStorage with debouncing
  const saveDraft = React.useCallback((data) => {
    // Clear existing timers
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    
    // Show saving status immediately
    setSaveStatus('saving');
    
    // Debounce the actual save operation
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
        setSaveStatus('saved');
        
        // Auto-hide after 2 seconds
        hideTimerRef.current = setTimeout(() => {
          setSaveStatus(null);
        }, 2000);
      } catch (error) {
        console.error('Auto-save error:', error);
        setSaveStatus('error');
        
        // Keep error visible for 4 seconds
        hideTimerRef.current = setTimeout(() => {
          setSaveStatus(null);
        }, 4000);
      }
    }, debounceMs);
  }, [storageKey, debounceMs]);
  
  // Load draft from localStorage
  const loadDraft = React.useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Load draft error:', error);
      return null;
    }
  }, [storageKey]);
  
  // Clear draft from localStorage
  const clearDraft = React.useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setSaveStatus(null);
    } catch (error) {
      console.error('Clear draft error:', error);
    }
  }, [storageKey]);
  
  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);
  
  return {
    saveStatus,
    saveDraft,
    loadDraft,
    clearDraft
  };
}