'use client';

import { useState, useCallback, useEffect } from 'react';

export function useFormConfig() {
  const [schools, setSchools] = useState([]);
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [collegeDomain, setCollegeDomain] = useState('jecrc.ac.in');
  const [validationRules, setValidationRules] = useState([]);
  const [countryCodes, setCountryCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all configuration data at once
  const fetchAllConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/public/config?type=all');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch configuration');
      }
      
      setSchools(result.data.schools || []);
      setCourses(result.data.courses || []);
      setBranches(result.data.branches || []);
      setCollegeDomain(result.data.collegeDomain || 'jecrc.ac.in');
      setValidationRules(result.data.validationRules || []);
      setCountryCodes(result.data.countryCodes || []);
    } catch (err) {
      console.error('Fetch config error:', err);
      setError(err.message);
      // Set defaults on error
      setCountryCodes([
        { country_name: 'India', country_code: 'IN', dial_code: '+91', display_order: 1 }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch courses by school
  const fetchCoursesBySchool = useCallback(async (schoolId) => {
    if (!schoolId) {
      setCourses([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/public/config?type=courses&school_id=${schoolId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch courses');
      }
      
      setCourses(result.data || []);
    } catch (err) {
      console.error('Fetch courses error:', err);
      setError(err.message);
    }
  }, []);

  // Fetch branches by course
  const fetchBranchesByCourse = useCallback(async (courseId) => {
    if (!courseId) {
      setBranches([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/public/config?type=branches&course_id=${courseId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch branches');
      }
      
      setBranches(result.data || []);
    } catch (err) {
      console.error('Fetch branches error:', err);
      setError(err.message);
    }
  }, []);

  // Get courses for selected school
  const getCoursesForSchool = useCallback((schoolId) => {
    return courses.filter(course => course.school_id === schoolId);
  }, [courses]);

  // Get branches for selected course
  const getBranchesForCourse = useCallback((courseId) => {
    return branches.filter(branch => branch.course_id === courseId);
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