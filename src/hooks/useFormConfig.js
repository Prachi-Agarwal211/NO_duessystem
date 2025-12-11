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
      
      console.log('🔧 Config API Response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch configuration');
      }
      
      setSchools(result.data.schools || []);
      setCourses(result.data.courses || []);
      setBranches(result.data.branches || []);
      setCollegeDomain(result.data.collegeDomain || 'jecrcu.edu.in');
      setValidationRules(result.data.validationRules || []);
      setCountryCodes(result.data.countryCodes || []);
      
      logger.success('Configuration loaded', {
        schoolsCount: result.data.schools?.length || 0,
        coursesCount: result.data.courses?.length || 0,
        branchesCount: result.data.branches?.length || 0
      });
    } catch (err) {
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

  // Fetch courses by school with proper loading state and cache busting
  const fetchCoursesBySchool = useCallback(async (schoolId) => {
    if (!schoolId) {
      setCourses([]);
      return [];
    }
    
    setCoursesLoading(true);
    try {
      const cacheBuster = `&_t=${Date.now()}`;
      const response = await fetch(`/api/public/config?type=courses&school_id=${schoolId}${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch courses');
      }
      
      const coursesData = result.data || [];
      setCourses(coursesData);
      logger.success('Courses fetched', {
        schoolId,
        count: coursesData.length
      });
      return coursesData;
    } catch (err) {
      logger.apiError(`/api/public/config?type=courses&school_id=${schoolId}`, err, {
        action: 'fetchCoursesBySchool',
        schoolId
      });
      setError(err.message);
      setCourses([]);
      return [];
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  // Fetch branches by course with proper loading state and cache busting
  const fetchBranchesByCourse = useCallback(async (courseId) => {
    if (!courseId) {
      setBranches([]);
      return [];
    }
    
    setBranchesLoading(true);
    try {
      const cacheBuster = `&_t=${Date.now()}`;
      const response = await fetch(`/api/public/config?type=branches&course_id=${courseId}${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch branches');
      }
      
      const branchesData = result.data || [];
      setBranches(branchesData);
      logger.success('Branches fetched', {
        courseId,
        count: branchesData.length
      });
      return branchesData;
    } catch (err) {
      logger.apiError(`/api/public/config?type=branches&course_id=${courseId}`, err, {
        action: 'fetchBranchesByCourse',
        courseId
      });
      setError(err.message);
      setBranches([]);
      return [];
    } finally {
      setBranchesLoading(false);
    }
  }, []);

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