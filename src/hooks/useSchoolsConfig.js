'use client';

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useSchoolsConfig() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get auth token
  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }, []);

  // Fetch schools
  const fetchSchools = useCallback(async (includeInactive = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getAuthToken();
      const url = `/api/admin/config/schools?include_inactive=${includeInactive}`;
      
      console.log('Fetching schools from:', url);
      
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      console.log('Schools API response status:', response.status);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response. Please check console for details.');
      }
      
      const result = await response.json();
      console.log('Schools API result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch schools');
      }
      
      setSchools(result.data || []);
      console.log('Schools loaded:', result.data?.length || 0);
    } catch (err) {
      console.error('Fetch schools error:', err);
      setError(err.message || 'Failed to load schools');
      setSchools([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  // Add school
  const addSchool = useCallback(async (schoolData) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/admin/config/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(schoolData)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add school');
      }
      
      // Optimistic update: Add to state without refetching
      setSchools(prev => [result.data, ...prev]);
      return result.data;
    } catch (err) {
      console.error('Add school error:', err);
      throw err;
    }
  }, [getAuthToken]);

  // Update school
  const updateSchool = useCallback(async (id, updates) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/admin/config/schools', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, ...updates })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update school');
      }
      
      // Optimistic update: Update in state without refetching
      setSchools(prev => prev.map(school =>
        school.id === id ? result.data : school
      ));
      return result.data;
    } catch (err) {
      console.error('Update school error:', err);
      throw err;
    }
  }, [getAuthToken]);

  // Delete school
  const deleteSchool = useCallback(async (id) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/admin/config/schools?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete school');
      }
      
      // Optimistic update: Remove from state without refetching
      setSchools(prev => prev.filter(school => school.id !== id));
      return true;
    } catch (err) {
      console.error('Delete school error:', err);
      throw err;
    }
  }, [getAuthToken]);

  // Fetch on mount
  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  return {
    schools,
    loading,
    error,
    fetchSchools,
    addSchool,
    updateSchool,
    deleteSchool
  };
}