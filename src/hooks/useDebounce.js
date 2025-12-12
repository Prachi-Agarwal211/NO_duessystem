'use client';

import { useState, useEffect } from 'react';

/**
 * Debounce hook - Delays updating a value until after a specified delay
 * Useful for search inputs, API calls, and preventing excessive re-renders
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 500ms)
 * @returns {any} The debounced value
 * 
 * @example
 * const searchTerm = useDebounce(inputValue, 500);
 * useEffect(() => {
 *   // API call only happens 500ms after user stops typing
 *   fetchResults(searchTerm);
 * }, [searchTerm]);
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up timeout to update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: Cancel timeout if value changes before delay completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}