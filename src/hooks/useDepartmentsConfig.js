import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Environment-based logging utility
const isDevelopment = process.env.NODE_ENV === 'development';
const log = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

/**
 * Custom hook for managing departments configuration
 * Provides UPDATE operations for departments (no add/delete - system critical)
 */
export function useDepartmentsConfig() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch all departments from API
   * @param {boolean} includeInactive - Include inactive departments
   */
  const fetchDepartments = useCallback(async (includeInactive = true) => {
    log('🏢 fetchDepartments called:', { includeInactive });
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      let url = '/api/admin/config/departments';
      if (includeInactive) url += '?include_inactive=true';

      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch departments');
      }

      const data = await response.json();
      log('🏢 Departments API response:', data);
      setDepartments(data.departments || []);
      log('🏢 Departments loaded:', data.departments?.length || 0);
      return data.departments;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching departments:', err);
      setDepartments([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update an existing department
   * Can update: display_name, email, display_order, is_active
   * Cannot update: id, code (system critical)
   * @param {string} departmentId - Department ID to update
   * @param {Object} updates - Fields to update
   */
  const updateDepartment = useCallback(async (departmentName, updates) => {
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/config/departments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: departmentName, ...updates })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update department');
      }

      const data = await response.json();
      
      // Optimized state update with early return
      setDepartments(prev => {
        const index = prev.findIndex(dept => dept.name === departmentName);
        if (index === -1) return prev;
        
        const updated = [...prev];
        updated[index] = data.department;
        return updated;
      });
      
      return data.department;
    } catch (err) {
      setError(err.message);
      console.error('Error updating department:', err);
      throw err;
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return {
    departments,
    loading,
    error,
    fetchDepartments,
    updateDepartment
  };
}