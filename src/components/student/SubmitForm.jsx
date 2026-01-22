'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, Check, X } from 'lucide-react';
import FormInput from './FormInput';

import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import { useFormConfig } from '@/hooks/useFormConfig';
import { DropdownWithErrorBoundary } from '@/components/ui/DropdownErrorBoundary';
import { createLogger } from '@/lib/errorLogger';
import FormInstructions from './FormInstructions';
// Removed: FireNebulaBackground and PearlGradientOverlay - animations too intense

const logger = createLogger('SubmitForm');

export default function SubmitForm() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Load dynamic configuration (includes validation rules and country codes)
  const {
    schools,
    courses,
    branches,
    collegeDomain,
    countryCodes,
    validateField,
    loading: configLoading,
    coursesLoading,
    branchesLoading,
    fetchCoursesBySchool,
    fetchBranchesByCourse,
    getCoursesForSchool,
    getBranchesForCourse
  } = useFormConfig();

  const [formData, setFormData] = useState({
    registration_no: '',
    student_name: '',
    admission_year: '', // Admission year
    passing_year: '',   // Passing year
    parent_name: '',
    school: '',
    course: '',
    branch: '',
    country_code: '+91',
    contact_no: '',
    personal_email: '',
    college_email: '',
    alumni_profile_link: '',
  });

  // Filtered options based on selections
  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);


  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formId, setFormId] = useState(null);

  // Student data fetching states
  const [fetchingStudent, setFetchingStudent] = useState(false);
  const [studentDataFound, setStudentDataFound] = useState(null);
  const [studentFetchError, setStudentFetchError] = useState('');

  // Update available courses when school changes - Use API call for fresh data
  useEffect(() => {
    const loadCourses = async () => {
      if (formData.school) {
        logger.debug('School selected', { schoolId: formData.school });

        // Fetch courses from API for selected school
        const coursesForSchool = await fetchCoursesBySchool(formData.school);
        logger.debug('Courses loaded for school', {
          schoolId: formData.school,
          count: coursesForSchool.length
        });
        setAvailableCourses(coursesForSchool);

        // Reset course and branch since school changed
        if (formData.course) {
          setFormData(prev => ({ ...prev, course: '', branch: '' }));
          setAvailableBranches([]);
        }
      } else {
        setAvailableCourses([]);
        setAvailableBranches([]);
      }
    };

    loadCourses();
  }, [formData.school, fetchCoursesBySchool]);

  // Update available branches when course changes - Use API call for fresh data
  useEffect(() => {
    const loadBranches = async () => {
      if (formData.course) {
        logger.debug('Course selected', { courseId: formData.course });

        // Fetch branches from API for selected course
        const branchesForCourse = await fetchBranchesByCourse(formData.course);
        logger.debug('Branches loaded for course', {
          courseId: formData.course,
          count: branchesForCourse.length
        });
        setAvailableBranches(branchesForCourse);

        // Reset branch since course changed
        if (formData.branch) {
          setFormData(prev => ({ ...prev, branch: '' }));
        }
      } else {
        setAvailableBranches([]);
      }
    };

    loadBranches();
  }, [formData.course, fetchBranchesByCourse]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Special handling for cascading dropdowns
    if (name === 'school') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        course: '', // Reset dependent fields
        branch: ''
      }));
    } else if (name === 'course') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        branch: '' // Reset dependent field
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    setError('');

  };

  const checkExistingForm = async () => {
    if (!formData.registration_no) {
      setError('Please enter registration number');
      return;
    }

    setChecking(true);
    setError('');

    try {
      // Use API endpoint instead of direct Supabase client query
      // This avoids RLS issues and works in all environments
      // Note: API expects 'registration_no' parameter
      const response = await fetch(`/api/student/can-edit?registration_no=${encodeURIComponent(formData.registration_no.trim().toUpperCase())}`);

      const result = await response.json();

      if (response.status === 404 || result.error === 'Form not found') {
        // No form exists - user can proceed
        setError('');
        alert('✅ No existing form found. You can proceed with submission.');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to check form status');
      }

      // Form exists
      if (result.success && result.data) {
        setError('A form already exists for this registration number. Redirecting to status page...');
        setTimeout(() => {
          router.push(`/student/check-status?reg=${formData.registration_no.toUpperCase()}`);
        }, 2000);
      }
    } catch (err) {
      console.error('Error checking form:', err);
      setError(err.message || 'Failed to check existing form');
    } finally {
      setChecking(false);
    }
  };

  // Fetch student data from database
  const fetchStudentData = async (registrationNo) => {
    if (!registrationNo) {
      setStudentFetchError('Please enter registration number first');
      return;
    }

    setFetchingStudent(true);
    setStudentFetchError('');
    setStudentDataFound(null);

    try {
      const response = await fetch(`/api/student/lookup?registration_no=${encodeURIComponent(registrationNo.trim().toUpperCase())}`);
      const result = await response.json();

      if (response.ok && result.success) {
        // Auto-fill form with student data
        const studentData = result.data;

        // Check if student already has a form or is completed
        if (studentData.no_dues_status === 'pending') {
          alert(`⚠️ Notice: You already have a pending application. You can view its status using the Check Status feature.`);
        } else if (studentData.no_dues_status === 'completed') {
          alert(`✅ Notice: Your No Dues process is already completed. You can download your certificate from the status page.`);
        }

        setFormData(prev => ({
          ...prev,
          student_name: studentData.student_name || prev.student_name,
          admission_year: studentData.admission_year || prev.admission_year,
          passing_year: studentData.passing_year || prev.passing_year,
          parent_name: studentData.parent_name || prev.parent_name,
          school: studentData.school || prev.school,
          course: studentData.course || prev.course,
          branch: studentData.branch || prev.branch,
          country_code: studentData.country_code || prev.country_code,
          contact_no: studentData.contact_no || prev.contact_no,
          personal_email: studentData.personal_email || prev.personal_email,
          college_email: studentData.college_email || prev.college_email,
          alumni_profile_link: studentData.alumni_profile_link || prev.alumni_profile_link
        }));

        setStudentDataFound(studentData);
        setError('');

        // Load courses and branches if school/course data is available
        // Note: studentData.school/course/branch might be UUIDs or names
        if (studentData.school) {
          const coursesForSchool = await fetchCoursesBySchool(studentData.school);
          setAvailableCourses(coursesForSchool);

          if (studentData.course) {
            const branchesForCourse = await fetchBranchesByCourse(studentData.course);
            setAvailableBranches(branchesForCourse);
          }
        }

      } else {
        setStudentFetchError(result.message || 'Student not found in database');
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
      setStudentFetchError('Failed to fetch student data. Please try again.');
    } finally {
      setFetchingStudent(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Basic required field validation (keep client-side for immediate feedback)
      if (!formData.registration_no?.trim()) {
        throw new Error('Registration number is required');
      }

      if (!formData.student_name?.trim()) {
        throw new Error('Student name is required');
      }

      if (!formData.school) {
        throw new Error('School selection is required');
      }

      if (!formData.course) {
        throw new Error('Course selection is required');
      }

      if (!formData.branch) {
        throw new Error('Branch selection is required');
      }

      if (!formData.personal_email?.trim()) {
        throw new Error('Personal email is required');
      }

      if (!formData.college_email?.trim()) {
        throw new Error('College email is required');
      }

      if (!formData.contact_no?.trim()) {
        throw new Error('Contact number is required');
      }

      // Basic email format check (detailed validation on server)
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.personal_email.trim())) {
        throw new Error('Invalid personal email format');
      }

      if (!emailPattern.test(formData.college_email.trim())) {
        throw new Error('Invalid college email format');
      }

      // College email domain check (only if collegeDomain is loaded)
      if (collegeDomain && !formData.college_email.toLowerCase().endsWith(collegeDomain.toLowerCase())) {
        throw new Error(`College email must end with ${collegeDomain}`);
      }

      // Mandatory checks for fields that might be missing validation
      if (!formData.passing_year?.trim()) throw new Error('Passing Year is required');
      if (!formData.parent_name?.trim()) throw new Error('Parent Name is required');
      if (!formData.alumni_profile_link?.trim()) throw new Error('Alumni Profile Link is required');

      // Admission/Passing year validation
      if (formData.admission_year) {
        // Validate YYYY format
        if (!/^\d{4}$/.test(formData.admission_year)) {
          throw new Error('Admission Year must be in YYYY format (e.g., 2020)');
        }
        const admissionYear = parseInt(formData.admission_year);
        const currentYear = new Date().getFullYear();
        if (admissionYear < 1950 || admissionYear > currentYear + 1) {
          throw new Error('Please enter a valid Admission Year');
        }
      }

      if (formData.passing_year) {
        // Validate YYYY format
        if (!/^\d{4}$/.test(formData.passing_year)) {
          throw new Error('Passing Year must be in YYYY format (e.g., 2024)');
        }
        const passingYear = parseInt(formData.passing_year);
        const currentYear = new Date().getFullYear();
        if (passingYear < 1950 || passingYear > currentYear + 10) {
          throw new Error('Please enter a valid Passing Year');
        }
      }

      // Validate year range (if both provided)
      if (formData.admission_year && formData.passing_year) {
        const admissionYear = parseInt(formData.admission_year);
        const passingYear = parseInt(formData.passing_year);
        if (passingYear < admissionYear) {
          throw new Error('Passing Year must be greater than or equal to Admission Year');
        }
        if (passingYear - admissionYear > 10) {
          throw new Error('Duration between Admission and Passing Year cannot exceed 10 years');
        }
      }

      // Note: Detailed format validation (registration number, phone, names)
      // is handled by server using configurable database rules

      // Sanitize and prepare data
      // Send UUIDs for school, course, branch - backend will look up names
      const sanitizedData = {
        registration_no: formData.registration_no.trim().toUpperCase(),
        student_name: formData.student_name.trim(),
        admission_year: formData.admission_year?.trim() ? formData.admission_year.trim() : null,
        passing_year: formData.passing_year?.trim() ? formData.passing_year.trim() : null,
        parent_name: formData.parent_name?.trim() ? formData.parent_name.trim() : null,
        school: formData.school,        // Send UUID from dropdown
        course: formData.course,        // Send UUID from dropdown
        branch: formData.branch,        // Send UUID from dropdown
        country_code: formData.country_code,
        contact_no: formData.contact_no.trim(),
        personal_email: formData.personal_email.trim().toLowerCase(),
        college_email: formData.college_email.trim().toLowerCase(),
        alumni_profile_link: (formData.alumni_profile_link || '').trim()
      };

      // ==================== SUBMIT VIA API ROUTE ====================
      // This ensures server-side validation and email notifications

      // Create timeout promise (30 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout. Please try again.')), 30000)
      );

      // Create fetch promise
      const fetchPromise = fetch('/api/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
      });

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Handle API errors with specific messages
        if (response.status === 409 || result.duplicate) {
          throw new Error('A form with this registration number already exists. Redirecting to status page...');
        }

        // Show specific field errors if available
        if (result.field && result.error) {
          throw new Error(`${result.error}`);
        }

        // Show detailed error if available
        if (result.details && typeof result.details === 'object') {
          const errorMessages = Object.values(result.details).join('. ');
          throw new Error(errorMessages || 'Please check all required fields');
        }

        throw new Error(result.error || 'Failed to submit form. Please check all fields and try again.');
      }

      if (!result.data) {
        throw new Error('Failed to create form record');
      }

      setFormId(result.data.id);
      setSuccess(true);

      logger.success('Form submitted successfully', {
        formId: result.data.id,
        registrationNo: sanitizedData.registration_no
      });

      // Redirect to status page after 3 seconds
      setTimeout(() => {
        router.push(`/student/check-status?reg=${sanitizedData.registration_no}`);
      }, 3000);

    } catch (err) {
      logger.error(err, {
        action: 'formSubmission',
        registrationNo: formData.registration_no,
        school: formData.school,
        course: formData.course,
        branch: formData.branch
      });

      // Provide user-friendly error messages
      let errorMessage = err.message;

      if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
        errorMessage = 'A form with this registration number already exists. Please check your status or contact support.';
        // Auto-redirect to check status after showing error
        setTimeout(() => {
          router.push(`/student/check-status?reg=${formData.registration_no.toUpperCase()}`);
        }, 3000);
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (!errorMessage || errorMessage === 'undefined') {
        errorMessage = 'An unexpected error occurred. Please try again or contact support.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`max-w-lg mx-auto text-center p-8 sm:p-12 rounded-3xl shadow-2xl transition-all duration-300
          ${isDark ? 'bg-gradient-to-br from-gray-900 to-black border border-white/10' : 'bg-white border border-gray-100'}`}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shadow-inner"
        >
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
        </motion.div>

        <h2 className={`text-3xl font-extrabold mb-4 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Application Submitted!
        </h2>

        <p className={`text-base mb-8 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Your no dues application has been successfully recorded. You can track its live status using your Registration Number.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push(`/student/check-status?reg=${formData.registration_no}`)}
            className="px-6 py-3.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl font-semibold shadow-lg shadow-jecrc-red/25 transition-all active:scale-95"
          >
            Track Status
          </button>
          <button
            onClick={() => window.location.reload()}
            className={`px-6 py-3.5 rounded-xl font-semibold transition-all active:scale-95 border ${isDark
              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
              }`}
          >
            Submit Another
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-8" // Increased spacing for comfort
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg flex items-start gap-3 transition-all duration-700
            ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-500">{error}</p>
        </motion.div>
      )}

      {/* Important Instructions Block */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 sm:p-8 rounded-xl border mb-8 ${isDark
          ? 'bg-blue-900/10 border-blue-500/20'
          : 'bg-blue-50 border-blue-100'
          }`}
      >
        <h3 className={`text-base font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-700'
          }`}>
          <AlertCircle className="w-5 h-5" />
          Important Instructions
        </h3>
        <ul className={`space-y-2.5 text-sm list-disc pl-5 ${isDark ? 'text-blue-200/70' : 'text-blue-600'
          }`}>
          <li>All fields marked with <span className="text-red-500 font-bold">*</span> are mandatory.</li>
          <li>Please ensure all details match your official college records.</li>
          <li>After submission, you can track your application status using your Registration Number.</li>
          <li className="font-semibold text-amber-500 dark:text-amber-400">
            If you haven't created an Alumni account yet, please register at{' '}
            <a
              href="https://jualumni.in"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
            >
              jualumni.in
            </a>
            . Failure to register may lead to rejection of your No Dues application.
          </li>
        </ul>
      </motion.div>

      {/* Registration Number with Check Button AND Fetch Details Button */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05, duration: 0.2, type: "spring", stiffness: 200 }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FormInput
              label="Registration Number"
              name="registration_no"
              value={formData.registration_no}
              onChange={handleInputChange}
              required
              placeholder="e.g., 22BCAN001"
              disabled={loading}
            />

            {/* Student Data Fetch Status */}
            {fetchingStudent && (
              <div className="absolute right-3 top-11 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-xs text-blue-500">Fetching...</span>
              </div>
            )}

            {!fetchingStudent && studentDataFound && (
              <div className="absolute right-3 top-11 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-xs text-green-500">Found</span>
              </div>
            )}

            {!fetchingStudent && studentFetchError && (
              <div className="absolute right-3 top-11 flex items-center gap-2">
                <X className="w-5 h-5 text-red-500" />
                <span className="text-xs text-red-500">Not found</span>
              </div>
            )}
          </div>

          {/* Buttons container - Stack vertically on mobile */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Auto-Fill Button */}
            <button
              type="button"
              onClick={() => fetchStudentData(formData.registration_no)}
              disabled={fetchingStudent || !formData.registration_no}
              className={`
                sm:mt-6 px-5 py-3 rounded-xl font-semibold transition-all duration-200 
                flex items-center justify-center gap-2 text-sm w-full sm:w-auto h-[52px] shadow-sm
                disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]
                ${isDark
                  ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }
              `}
              title="Auto-fill student details from database"
            >
              {fetchingStudent ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <span>Auto-Fill</span>
                </>
              )}
            </button>

            {/* Check Status Button */}
            <button
              type="button"
              onClick={checkExistingForm}
              disabled={checking || !formData.registration_no}
              className={`
                sm:mt-6 px-5 py-3 rounded-xl font-semibold transition-all duration-200 
                flex items-center justify-center gap-2 text-sm w-full sm:w-auto h-[52px] shadow-sm
                disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]
                ${isDark
                  ? 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }
              `}
              title="Check if application already exists"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                <>
                  <span>Check Status</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Show student data when successfully fetched */}
      {studentDataFound && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg text-sm transition-all duration-700
            ${isDark ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}
        >
          <div className={`font-medium mb-1 transition-colors duration-700
            ${isDark ? 'text-green-400' : 'text-green-700'}`}>
            ✓ Student Data Found - Details Fetched
          </div>
          <div className={`space-y-1 transition-colors duration-700
            ${isDark ? 'text-green-300/80' : 'text-green-600'}`}>
            <div><strong>Name:</strong> {studentDataFound.student_name}</div>
            <div><strong>School:</strong> {studentDataFound.school}</div>
            <div><strong>Course:</strong> {studentDataFound.course}</div>
            {studentDataFound.branch && <div><strong>Branch:</strong> {studentDataFound.branch}</div>}
          </div>
        </motion.div>
      )}

      {/* Show error message when student not found */}
      {studentFetchError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg text-sm transition-all duration-700
            ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}
        >
          <div className={`flex items-start gap-2 transition-colors duration-700 ease-smooth ${isDark ? 'text-amber-400' : 'text-amber-700'
            }`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">{studentFetchError}</p>
              <p className={`text-xs transition-colors duration-700 ease-smooth ${isDark ? 'text-amber-300/70' : 'text-amber-600'
                }`}>
                You can still proceed by manually filling the form below. If you believe this is an error, please contact the admin.
              </p>
            </div>
          </div>
        </motion.div>
      )}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3, type: "spring", stiffness: 200 }}
      >
        <div className="md:col-span-2">
          <FormInput
            label="Student Name"
            name="student_name"
            value={formData.student_name}
            onChange={handleInputChange}
            required
            placeholder="Full Name"
            disabled={loading}
          />
        </div>

        {/* Country Code */}
        <FormInput
          label="Country Code"
          name="country_code"
          type="select"
          value={formData.country_code}
          onChange={handleInputChange}
          required
          disabled={loading || configLoading}
          options={countryCodes.map(c => ({
            value: c.dial_code,
            label: `${c.country_name} (${c.dial_code})`
          }))}
        />

        {/* Contact Number */}
        <FormInput
          label="Contact Number"
          name="contact_no"
          type="tel"
          value={formData.contact_no}
          onChange={handleInputChange}
          required
          placeholder="6-15 digits (without country code)"
          disabled={loading}
          pattern="[0-9]{6,15}"
          inputMode="tel"
        />

        <FormInput
          label="Admission Year"
          name="admission_year"
          value={formData.admission_year}
          onChange={handleInputChange}
          placeholder="e.g., 2020"
          maxLength={4}
          pattern="\d{4}"
          required
          disabled={loading}
        />

        <FormInput
          label="Passing Year"
          name="passing_year"
          value={formData.passing_year}
          onChange={handleInputChange}
          placeholder="e.g., 2024"
          maxLength={4}
          pattern="\d{4}"
          required
          disabled={loading}
        />

        <div className="md:col-span-2">
          <FormInput
            label="Parent Name"
            name="parent_name"
            value={formData.parent_name}
            onChange={handleInputChange}
            placeholder="Father's/Mother's Name"
            required
            disabled={loading}
          />
        </div>

        <div className="md:col-span-2">
          <DropdownWithErrorBoundary
            componentName="SchoolDropdown"
            dropdownType="schools"
            onReset={() => window.location.reload()}
          >
            <FormInput
              label="School"
              name="school"
              type="select"
              value={formData.school}
              onChange={handleInputChange}
              required
              disabled={loading || configLoading}
              loading={configLoading}
              placeholder={configLoading ? "Loading schools..." : "Select School"}
              options={schools.map(s => ({ value: s.id, label: s.name }))}
            />
          </DropdownWithErrorBoundary>
        </div>

        <DropdownWithErrorBoundary
          componentName="CourseDropdown"
          dropdownType="courses"
          onReset={() => {
            setFormData(prev => ({ ...prev, course: '', branch: '' }));
            setAvailableCourses([]);
          }}
        >
          <FormInput
            label="Course"
            name="course"
            type="select"
            value={formData.course}
            onChange={handleInputChange}
            required
            disabled={loading || configLoading || coursesLoading || !formData.school}
            loading={coursesLoading}
            placeholder={
              coursesLoading
                ? "Loading courses..."
                : !formData.school
                  ? "Select a school first"
                  : availableCourses.length === 0
                    ? "No courses available"
                    : "Select Course"
            }
            options={availableCourses.map(c => ({ value: c.id, label: c.name }))}
          />
        </DropdownWithErrorBoundary>

        <DropdownWithErrorBoundary
          componentName="BranchDropdown"
          dropdownType="branches"
          onReset={() => {
            setFormData(prev => ({ ...prev, branch: '' }));
            setAvailableBranches([]);
          }}
        >
          <FormInput
            label="Branch"
            name="branch"
            type="select"
            value={formData.branch}
            onChange={handleInputChange}
            required
            disabled={loading || configLoading || branchesLoading || !formData.course}
            loading={branchesLoading}
            placeholder={
              branchesLoading
                ? "Loading branches..."
                : !formData.course
                  ? "Select a course first"
                  : availableBranches.length === 0
                    ? "No branches available"
                    : "Select Branch"
            }
            options={availableBranches.map(b => ({ value: b.id, label: b.name }))}
          />
        </DropdownWithErrorBoundary>

        <FormInput
          label="Personal Email"
          name="personal_email"
          type="email"
          value={formData.personal_email}
          onChange={handleInputChange}
          required
          placeholder="your.email@example.com"
          disabled={loading}
        />

        <FormInput
          label={`College Email (must end with ${collegeDomain})`}
          name="college_email"
          type="email"
          value={formData.college_email}
          onChange={handleInputChange}
          required
          placeholder={`yourname${collegeDomain}`}
          disabled={loading}
        />

        {/* ALUMNI PROFILE LINK (MANDATORY) */}
        <div className="md:col-span-2">
          <FormInput
            label="Alumni Profile Link (Mandatory)"
            name="alumni_profile_link"
            type="url"
            value={formData.alumni_profile_link}
            onChange={handleInputChange}
            required
            placeholder="https://jualumni.in/profile/123456"
            disabled={loading}
          />
          <p className={`text-xs mt-2 ml-1 transition-colors duration-300 ${isDark ? 'text-amber-400/90' : 'text-amber-700/90'}`}>
            <span className="font-bold">Instruction:</span> Please visit <a href="https://jualumni.in" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-500 font-medium">jualumni.in</a>, go to your profile section, copy your profile link, and paste it here.
          </p>
        </div>
      </motion.div>

      {/* Alumni Screenshot Upload Removed as per requirement */}

      {/* Form Actions */}
      <div className="pt-6 border-t border-gray-100 dark:border-white/5 mt-8">
        <button
          type="submit"
          disabled={loading}
          className={`
            w-full py-4 rounded-xl font-bold text-base tracking-wide uppercase transition-all duration-300
            flex items-center justify-center gap-2
            shadow-lg hover:shadow-xl active:scale-[0.99]
            disabled:opacity-70 disabled:cursor-not-allowed
            bg-[#c41e3a] hover:bg-[#a01830] text-white
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Submitting Application...</span>
            </>
          ) : (
            <>
              <span className={isDark ? "pl-[2px]" : ""}>Submit Application</span>
              <span className="ml-1 opacity-70">→</span>
            </>
          )}
        </button>
        <p className={`text-center mt-4 text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
          By clicking submit, you confirm all details are accurate.
        </p>
      </div>
    </motion.form>
  );
}