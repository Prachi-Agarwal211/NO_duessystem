'use client';

import { useState, useCallback, useEffect } from 'react';

export function useCountryCodes() {
  const [countryCodes, setCountryCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all active country codes
  const fetchCountryCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/public/config?type=country_codes');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch country codes');
      }
      
      setCountryCodes(result.data || []);
    } catch (err) {
      console.error('Fetch country codes error:', err);
      setError(err.message);
      // Set default country codes as fallback
      setCountryCodes([
        { country_name: 'India', country_code: 'IN', dial_code: '+91', display_order: 1 },
        { country_name: 'United States', country_code: 'US', dial_code: '+1', display_order: 2 },
        { country_name: 'United Kingdom', country_code: 'GB', dial_code: '+44', display_order: 3 }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get country by dial code
  const getCountryByDialCode = useCallback((dialCode) => {
    return countryCodes.find(country => country.dial_code === dialCode);
  }, [countryCodes]);

  // Get country by country code (ISO)
  const getCountryByCode = useCallback((code) => {
    return countryCodes.find(country => country.country_code === code);
  }, [countryCodes]);

  // Fetch on mount
  useEffect(() => {
    fetchCountryCodes();
  }, [fetchCountryCodes]);

  return {
    countryCodes,
    loading,
    error,
    fetchCountryCodes,
    getCountryByDialCode,
    getCountryByCode
  };
}