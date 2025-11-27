import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Custom hook for managing courses configuration
 * Provides CRUD operations for courses with admin authentication
 */
export function useCoursesConfig() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  /**
   * Fetch courses from API
   * @param {string|null} schoolId - Filter by school ID (optional)
   * @param {boolean} includeInactive - Include inactive courses
   */
  const fetchCourses = useCallback(async (schoolId = null, includeInactive = false) => {
    console.log('🎓 fetchCourses called:', { schoolId, includeInactive });
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();

      let url = '/api/admin/config/courses';
      const params = new URLSearchParams();
      if (schoolId) params.append('school_id', schoolId);
      if (includeInactive) params.append('include_inactive', 'true');
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch courses');
      }

      const data = await response.json();
      console.log('📚 Courses API response:', data);
      setCourses(data.data || []);
      console.log('📚 Courses loaded:', data.data?.length || 0);
      return data.data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching courses:', err);
      setCourses([]); // Set empty array on error
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add a new course
   * @param {Object} courseData - { school_id, name, display_order }
   */
  const addCourse = useCallback(async (courseData) => {
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/config/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(courseData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add course');
      }

      const data = await response.json();
      setCourses(prev => [...prev, data.course]);
      return data.course;
    } catch (err) {
      setError(err.message);
      console.error('Error adding course:', err);
      throw err;
    }
  }, []);

  /**
   * Update an existing course
   * @param {string} courseId - Course ID to update
   * @param {Object} updates - Fields to update
   */
  const updateCourse = useCallback(async (courseId, updates) => {
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/config/courses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: courseId, ...updates })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update course');
      }

      const data = await response.json();
      setCourses(prev => prev.map(course => 
        course.id === courseId ? data.course : course
      ));
      return data.course;
    } catch (err) {
      setError(err.message);
      console.error('Error updating course:', err);
      throw err;
    }
  }, []);

  /**
   * Delete a course
   * @param {string} courseId - Course ID to delete
   */
  const deleteCourse = useCallback(async (courseId) => {
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/config/courses', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: courseId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete course');
      }

      setCourses(prev => prev.filter(course => course.id !== courseId));
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting course:', err);
      throw err;
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    loading,
    error,
    fetchCourses,
    addCourse,
    updateCourse,
    deleteCourse
  };
}