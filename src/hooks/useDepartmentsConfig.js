import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
  const fetchDepartments = useCallback(async (includeInactive = false) => {
    console.log('🏢 fetchDepartments called:', { includeInactive });
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
      console.log('🏢 Departments API response:', data);
      // API returns { success: true, departments: [] } NOT { success: true, data: [] }
      setDepartments(data.departments || []);
      console.log('🏢 Departments loaded:', data.departments?.length || 0);
      return data.departments;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching departments:', err);
      setDepartments([]); // Set empty array on error
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
  const updateDepartment = useCallback(async (departmentId, updates) => {
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
        body: JSON.stringify({ id: departmentId, ...updates })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update department');
      }

      const data = await response.json();
      setDepartments(prev => prev.map(dept => 
        dept.name === departmentId ? data.department : dept
      ));
      return data.department;
    } catch (err) {
      setError(err.message);
      console.error('Error updating department:', err);
      throw err;
    }
  }, []);

  /**
   * Toggle department active status
   * @param {string} departmentId - Department ID
   * @param {boolean} isActive - New active status
   */
  const toggleDepartmentStatus = useCallback(async (departmentId, isActive) => {
    return updateDepartment(departmentId, { is_active: isActive });
  }, [updateDepartment]);

  /**
   * Update department email
   * @param {string} departmentId - Department ID
   * @param {string} email - New email address
   */
  const updateDepartmentEmail = useCallback(async (departmentId, email) => {
    return updateDepartment(departmentId, { email });
  }, [updateDepartment]);

  /**
   * Update department display name
   * @param {string} departmentId - Department ID
   * @param {string} displayName - New display name
   */
  const updateDepartmentDisplayName = useCallback(async (departmentId, displayName) => {
    return updateDepartment(departmentId, { display_name: displayName });
  }, [updateDepartment]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return {
    departments,
    loading,
    error,
    fetchDepartments,
    updateDepartment,
    toggleDepartmentStatus,
    updateDepartmentEmail,
    updateDepartmentDisplayName
  };
}