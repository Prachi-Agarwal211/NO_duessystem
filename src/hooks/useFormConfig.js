'use client';

import { useState, useCallback, useEffect } from 'react';
import { createLogger } from '@/lib/errorLogger';

const logger = createLogger('useFormConfig');

export function useFormConfig() {
  const [schools, setSchools] = useState([]);
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [collegeDomain, setCollegeDomain] = useState('jecrcu.edu.in');
  const [validationRules, setValidationRules] = useState([]);
  const [countryCodes, setCountryCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🕵️ DEBUG LOGGING
  useEffect(() => {
    console.log(`📡 [ConfigHook] State Update - Schools: ${schools.length}, Courses: ${courses.length}, Branches: ${branches.length}`);
    if (schools.length > 0 && typeof window !== 'undefined') {
      window.__LAST_VALID_SCHOOLS__ = schools;
    }
  }, [schools, courses, branches]);

  // Fetch all configuration data at once with cache busting
  const fetchAllConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Add timestamp to bust cache
      const cacheBuster = `&_t=${Date.now()}`;
      const response = await fetch(`/api/public/config?type=all${cacheBuster}`, {
        cache: 'no-store', // Force no caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const result = await response.json();

      console.log('🔧 [ConfigHook] API Payload:', result.data);
      console.log('📊 [ConfigHook] Received counts:', result.counts || 'N/A');

      // Global debug helper
      if (typeof window !== 'undefined') {
        window.__CONFIG_DATA__ = result.data;
        window.__CONFIG_COUNTS__ = result.counts;
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch configuration');
      }

      const schoolsData = result.data.schools || [];
      const coursesData = result.data.courses || [];
      const branchesData = result.data.branches || [];

      setSchools(schoolsData);
      setCourses(coursesData);
      setBranches(branchesData);
      setCollegeDomain(result.data.collegeDomain || 'jecrcu.edu.in');
      setValidationRules(result.data.validationRules || []);
      setCountryCodes(result.data.countryCodes || []);

      logger.success('Configuration loaded', {
        schools: schoolsData.length,
        courses: coursesData.length,
        branches: branchesData.length
      });
    } catch (err) {
      console.error('❌ [ConfigHook] Error:', err.message);
      logger.apiError('/api/public/config?type=all', err, {
        action: 'fetchAllConfig'
      });
      setError(err.message);
      // Set defaults on error
      setCountryCodes([
        { country_name: 'India', country_code: 'IN', dial_code: '+91', display_order: 1 }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch courses by school (uses local data if available, otherwise fallback to API)
  const fetchCoursesBySchool = useCallback(async (schoolId) => {
    if (!schoolId) {
      return [];
    }

    setCoursesLoading(true);
    try {
      // 🥇 First, try to filter from locally cached data (faster, no network)
      if (courses.length > 0) {
        const localCourses = courses.filter(c => c.school_id === schoolId);
        if (localCourses.length > 0) {
          logger.debug('Courses filtered locally', { schoolId, count: localCourses.length });
          return localCourses;
        }
      }

      // 🥈 Fallback to API only if local data is empty or missing schoolId
      const cacheBuster = `&_t=${Date.now()}`;
      const response = await fetch(`/api/public/config?type=courses&school_id=${schoolId}${cacheBuster}`, {
        cache: 'no-store'
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch courses');
      }

      return result.data || [];
    } catch (err) {
      logger.apiError(`/api/public/config?type=courses&school_id=${schoolId}`, err);
      return [];
    } finally {
      setCoursesLoading(false);
    }
  }, [courses]);

  // Fetch branches by course (uses local data if available, otherwise fallback to API)
  const fetchBranchesByCourse = useCallback(async (courseId) => {
    if (!courseId) {
      return [];
    }

    setBranchesLoading(true);
    try {
      // 🥇 First, try to filter from locally cached data
      if (branches.length > 0) {
        const localBranches = branches.filter(b => b.course_id === courseId);
        if (localBranches.length > 0) {
          logger.debug('Branches filtered locally', { courseId, count: localBranches.length });
          return localBranches;
        }
      }

      // 🥈 Fallback to API
      const cacheBuster = `&_t=${Date.now()}`;
      const response = await fetch(`/api/public/config?type=branches&course_id=${courseId}${cacheBuster}`, {
        cache: 'no-store'
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch branches');
      }

      return result.data || [];
    } catch (err) {
      logger.apiError(`/api/public/config?type=branches&course_id=${courseId}`, err);
      return [];
    } finally {
      setBranchesLoading(false);
    }
  }, [branches]);

  // Get courses for selected school (client-side filtering for initial load)
  const getCoursesForSchool = useCallback((schoolId) => {
    if (!schoolId) return [];
    const filtered = courses.filter(course => course.school_id === schoolId);
    logger.debug('Filtered courses for school', { schoolId, count: filtered.length });
    return filtered;
  }, [courses]);

  // Get branches for selected course (client-side filtering for initial load)
  const getBranchesForCourse = useCallback((courseId) => {
    if (!courseId) return [];
    const filtered = branches.filter(branch => branch.course_id === courseId);
    logger.debug('Filtered branches for course', { courseId, count: filtered.length });
    return filtered;
  }, [branches]);

  // Get validation rule by name
  const getValidationRule = useCallback((ruleName) => {
    return validationRules.find(rule => rule.rule_name === ruleName);
  }, [validationRules]);

  // Validate value against a rule
  const validateField = useCallback((ruleName, value) => {
    const rule = getValidationRule(ruleName);
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
      return { valid: true };
    }
  }, [getValidationRule]);

  // Fetch on mount
  useEffect(() => {
    fetchAllConfig();
  }, [fetchAllConfig]);

  return {
    schools,
    courses,
    branches,
    collegeDomain,
    validationRules,
    countryCodes,
    loading,
    coursesLoading,
    branchesLoading,
    error,
    fetchAllConfig,
    fetchCoursesBySchool,
    fetchBranchesByCourse,
    getCoursesForSchool,
    getBranchesForCourse,
    getValidationRule,
    validateField
  };
}