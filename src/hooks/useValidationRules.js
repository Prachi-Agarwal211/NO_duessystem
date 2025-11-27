'use client';

import { useState, useCallback, useEffect } from 'react';

export function useValidationRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all active validation rules
  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/public/config?type=validation_rules');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch validation rules');
      }
      
      setRules(result.data || []);
    } catch (err) {
      console.error('Fetch validation rules error:', err);
      setError(err.message);
      // Set default rules as fallback
      setRules([
        { rule_name: 'registration_number', rule_pattern: '^[A-Z0-9]{6,15}$', error_message: 'Registration number must be 6-15 alphanumeric characters' },
        { rule_name: 'student_name', rule_pattern: '^[A-Za-z\\s.\\-\']+$', error_message: 'Name should only contain letters, spaces, dots, hyphens, and apostrophes' },
        { rule_name: 'phone_number', rule_pattern: '^[0-9]{6,15}$', error_message: 'Phone number must be 6-15 digits' },
        { rule_name: 'session_year', rule_pattern: '^\\d{4}$', error_message: 'Session year must be in YYYY format' }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get specific rule by name
  const getRule = useCallback((ruleName) => {
    return rules.find(rule => rule.rule_name === ruleName);
  }, [rules]);

  // Validate value against a rule
  const validate = useCallback((ruleName, value) => {
    const rule = getRule(ruleName);
    if (!rule) return { valid: true };
    
    try {
      const regex = new RegExp(rule.rule_pattern, 'i');
      const valid = regex.test(value);
      return {
        valid,
        error: valid ? null : rule.error_message
      };
    } catch (err) {
      console.error(`Invalid regex pattern for ${ruleName}:`, err);
      return { valid: true }; // Allow if regex is invalid
    }
  }, [getRule]);

  // Fetch on mount
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    rules,
    loading,
    error,
    fetchRules,
    getRule,
    validate
  };
}