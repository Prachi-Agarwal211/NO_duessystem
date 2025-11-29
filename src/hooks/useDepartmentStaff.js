import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Custom hook for managing department staff accounts
 * Provides CRUD operations for department staff users
 */
export function useDepartmentStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch all department staff members
   * @param {string} department - Optional filter by department
   */
  const fetchStaff = useCallback(async (department = null) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      let url = '/api/admin/staff';
      if (department) url += `?department=${encodeURIComponent(department)}`;

      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch staff');
      }

      const data = await response.json();
      setStaff(data.data || []);
      return data.data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching staff:', err);
      setStaff([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new department staff account
   * @param {Object} staffData - Staff member data
   * @param {string} staffData.email - Email address
   * @param {string} staffData.password - Password (min 6 chars)
   * @param {string} staffData.full_name - Full name
   * @param {string} staffData.department_name - Department name
   */
  const addStaff = useCallback(async (staffData) => {
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(staffData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create staff account');
      }

      const data = await response.json();
      setStaff(prev => [data.data, ...prev]);
      return data.data;
    } catch (err) {
      setError(err.message);
      console.error('Error creating staff:', err);
      throw err;
    }
  }, []);

  /**
   * Update an existing staff member
   * @param {string} staffId - Staff member ID
   * @param {Object} updates - Fields to update
   */
  const updateStaff = useCallback(async (staffId, updates) => {
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/staff', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: staffId, ...updates })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update staff account');
      }

      const data = await response.json();
      setStaff(prev => prev.map(s => s.id === staffId ? data.data : s));
      return data.data;
    } catch (err) {
      setError(err.message);
      console.error('Error updating staff:', err);
      throw err;
    }
  }, []);

  /**
   * Delete a staff member
   * @param {string} staffId - Staff member ID to delete
   */
  const deleteStaff = useCallback(async (staffId) => {
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`/api/admin/staff?id=${staffId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete staff account');
      }

      setStaff(prev => prev.filter(s => s.id !== staffId));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting staff:', err);
      throw err;
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  return {
    staff,
    loading,
    error,
    fetchStaff,
    addStaff,
    updateStaff,
    deleteStaff
  };
}