import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Custom hook for managing branches configuration
 * Provides CRUD operations for branches with admin authentication
 */
export function useBranchesConfig() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  /**
   * Fetch branches from API
   * @param {string|null} courseId - Filter by course ID (optional)
   * @param {boolean} includeInactive - Include inactive branches
   */
  const fetchBranches = useCallback(async (courseId = null, includeInactive = false) => {
    console.log('🌿 fetchBranches called:', { courseId, includeInactive });
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();

      let url = '/api/admin/config/branches';
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);
      if (includeInactive) params.append('include_inactive', 'true');
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch branches');
      }

      const data = await response.json();
      console.log('🌲 Branches API response:', data);
      setBranches(data.data || []);
      console.log('🌲 Branches loaded:', data.data?.length || 0);
      return data.data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching branches:', err);
      setBranches([]); // Set empty array on error
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add a new branch
   * @param {Object} branchData - { course_id, name, display_order }
   */
  const addBranch = useCallback(async (branchData) => {
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/config/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(branchData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add branch');
      }

      const data = await response.json();
      setBranches(prev => [...prev, data.branch]);
      return data.branch;
    } catch (err) {
      setError(err.message);
      console.error('Error adding branch:', err);
      throw err;
    }
  }, []);

  /**
   * Update an existing branch
   * @param {string} branchId - Branch ID to update
   * @param {Object} updates - Fields to update
   */
  const updateBranch = useCallback(async (branchId, updates) => {
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/config/branches', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: branchId, ...updates })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update branch');
      }

      const data = await response.json();
      setBranches(prev => prev.map(branch => 
        branch.id === branchId ? data.branch : branch
      ));
      return data.branch;
    } catch (err) {
      setError(err.message);
      console.error('Error updating branch:', err);
      throw err;
    }
  }, []);

  /**
   * Delete a branch
   * @param {string} branchId - Branch ID to delete
   */
  const deleteBranch = useCallback(async (branchId) => {
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/config/branches', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: branchId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete branch');
      }

      setBranches(prev => prev.filter(branch => branch.id !== branchId));
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting branch:', err);
      throw err;
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return {
    branches,
    loading,
    error,
    fetchBranches,
    addBranch,
    updateBranch,
    deleteBranch
  };
}