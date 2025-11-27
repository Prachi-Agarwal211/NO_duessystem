import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Custom hook for managing email configuration settings
 * Provides operations to manage college email domain and other email settings
 */
export function useEmailsConfig() {
  const [emailConfig, setEmailConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch email configuration from API
   */
  const fetchEmailConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/config/emails', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch email configuration');
      }

      const data = await response.json();
      console.log('📧 Email config fetch response:', data);
      
      // API returns { success: true, data: [...] } - array of config objects
      // Convert array to object with key-value pairs
      if (data.data && Array.isArray(data.data)) {
        const configObj = {};
        data.data.forEach(item => {
          configObj[item.key] = item.value;
        });
        setEmailConfig(configObj);
        return configObj;
      }
      
      setEmailConfig({});
      return {};
    } catch (err) {
      setError(err.message);
      console.error('Error fetching email config:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update email configuration
   * @param {string} key - Configuration key (e.g., 'college_email_domain')
   * @param {string} value - Configuration value
   */
  const updateEmailConfig = useCallback(async (key, value) => {
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/config/emails', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key, value })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update email configuration');
      }

      const data = await response.json();
      console.log('📧 Email config update response:', data);
      
      // API returns { success: true, data: { key, value, ... } }
      const configData = data.data;
      if (configData && configData.value !== undefined) {
        setEmailConfig(prev => ({
          ...prev,
          [key]: configData.value
        }));
      }
      return configData;
    } catch (err) {
      setError(err.message);
      console.error('Error updating email config:', err);
      throw err;
    }
  }, []);

  /**
   * Delete email configuration
   * @param {string} key - Configuration key to delete
   */
  const deleteEmailConfig = useCallback(async (key) => {
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/config/emails', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete email configuration');
      }

      setEmailConfig(prev => {
        const newConfig = { ...prev };
        delete newConfig[key];
        return newConfig;
      });
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting email config:', err);
      throw err;
    }
  }, []);

  /**
   * Get college email domain
   * @returns {string} College email domain (e.g., '@jecrc.ac.in')
   */
  const getCollegeDomain = useCallback(() => {
    return emailConfig.college_email_domain || '@jecrc.ac.in';
  }, [emailConfig]);

  /**
   * Update college email domain
   * @param {string} domain - New domain (e.g., '@jecrc.ac.in')
   */
  const updateCollegeDomain = useCallback(async (domain) => {
    // Validate domain format
    if (!domain.startsWith('@')) {
      throw new Error('Domain must start with @');
    }
    return updateEmailConfig('college_email_domain', domain);
  }, [updateEmailConfig]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchEmailConfig();
  }, [fetchEmailConfig]);

  return {
    emailConfig,
    loading,
    error,
    fetchEmailConfig,
    updateEmailConfig,
    deleteEmailConfig,
    getCollegeDomain,
    updateCollegeDomain
  };
}