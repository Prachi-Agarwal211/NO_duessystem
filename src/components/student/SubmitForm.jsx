'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import FormInput from './FormInput';
import FileUpload from './FileUpload';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import { useFormConfig } from '@/hooks/useFormConfig';

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
    getCoursesForSchool,
    getBranchesForCourse
  } = useFormConfig();

  const [formData, setFormData] = useState({
    registration_no: '',
    student_name: '',
    session_from: '', // Now represents admission_year
    session_to: '',   // Now represents passing_year
    parent_name: '',
    school: '',
    course: '',
    branch: '',
    country_code: '+91',
    contact_no: '',
    personal_email: '',
    college_email: '',
  });
  
  // Filtered options based on selections
  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formId, setFormId] = useState(null);

  // Update available courses when school changes
  useEffect(() => {
    if (formData.school) {
      const coursesForSchool = getCoursesForSchool(formData.school);
      console.log('🎓 Selected school:', formData.school);
      console.log('📚 Available courses for school:', coursesForSchool);
      setAvailableCourses(coursesForSchool);
      
      // Reset course and branch if current selection is not in filtered list
      if (formData.course && !coursesForSchool.find(c => c.id === formData.course)) {
        setFormData(prev => ({ ...prev, course: '', branch: '' }));
        setAvailableBranches([]);
      }
    } else {
      setAvailableCourses([]);
      setAvailableBranches([]);
    }
  }, [formData.school, getCoursesForSchool]);

  // Update available branches when course changes
  useEffect(() => {
    if (formData.course) {
      const branchesForCourse = getBranchesForCourse(formData.course);
      console.log('📖 Selected course:', formData.course);
      console.log('🌿 Available branches for course:', branchesForCourse);
      setAvailableBranches(branchesForCourse);
      
      // Reset branch if current selection is not in new course
      if (formData.branch && !branchesForCourse.find(b => b.id === formData.branch)) {
        setFormData(prev => ({ ...prev, branch: '' }));
      }
    } else {
      setAvailableBranches([]);
    }
  }, [formData.course, getBranchesForCourse]);

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
      const { data, error: queryError } = await supabase
        .from('no_dues_forms')
        .select('id')
        .eq('registration_no', formData.registration_no)
        .single();

      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError;
      }

      if (data) {
        setError('A form already exists for this registration number. Redirecting to status page...');
        setTimeout(() => {
          router.push(`/student/check-status?reg=${formData.registration_no}`);
        }, 2000);
      }
    } catch (err) {
      console.error('Error checking form:', err);
      setError('Failed to check existing form');
    } finally {
      setChecking(false);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.registration_no}-${Date.now()}.${fileExt}`;
      const filePath = `alumni-screenshots/${fileName}`;

      const { data, error } = await supabase.storage
        .from('alumni-screenshots')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('alumni-screenshots')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file. Please try again.');
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
      
      // College email domain check
      if (!formData.college_email.toLowerCase().endsWith(collegeDomain.toLowerCase())) {
        throw new Error(`College email must end with ${collegeDomain}`);
      }

      // Admission/Passing year validation
      if (formData.session_from) {
        // Validate YYYY format
        if (!/^\d{4}$/.test(formData.session_from)) {
          throw new Error('Admission Year must be in YYYY format (e.g., 2020)');
        }
        const admissionYear = parseInt(formData.session_from);
        const currentYear = new Date().getFullYear();
        if (admissionYear < 1950 || admissionYear > currentYear + 1) {
          throw new Error('Please enter a valid Admission Year');
        }
      }
      
      if (formData.session_to) {
        // Validate YYYY format
        if (!/^\d{4}$/.test(formData.session_to)) {
          throw new Error('Passing Year must be in YYYY format (e.g., 2024)');
        }
        const passingYear = parseInt(formData.session_to);
        const currentYear = new Date().getFullYear();
        if (passingYear < 1950 || passingYear > currentYear + 10) {
          throw new Error('Please enter a valid Passing Year');
        }
      }
      
      // Validate year range (if both provided)
      if (formData.session_from && formData.session_to) {
        const admissionYear = parseInt(formData.session_from);
        const passingYear = parseInt(formData.session_to);
        if (passingYear < admissionYear) {
          throw new Error('Passing Year must be greater than or equal to Admission Year');
        }
        if (passingYear - admissionYear > 10) {
          throw new Error('Duration between Admission and Passing Year cannot exceed 10 years');
        }
      }

      // Note: Detailed format validation (registration number, phone, names)
      // is handled by server using configurable database rules

      // Upload file if provided
      let fileUrl = null;
      if (file) {
        // Validate file before upload
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('File size must be less than 5MB');
        }
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error('Only JPEG, PNG, and WEBP images are allowed');
        }

        fileUrl = await uploadFile(file);
      }

      // Sanitize and prepare data
      // Send UUIDs for school, course, branch - backend will look up names
      const sanitizedData = {
        registration_no: formData.registration_no.trim().toUpperCase(),
        student_name: formData.student_name.trim(),
        session_from: formData.session_from?.trim() || null,
        session_to: formData.session_to?.trim() || null,
        parent_name: formData.parent_name?.trim() || null,
        school: formData.school,        // Send UUID from dropdown
        course: formData.course,        // Send UUID from dropdown
        branch: formData.branch,        // Send UUID from dropdown
        country_code: formData.country_code,
        contact_no: formData.contact_no.trim(),
        personal_email: formData.personal_email.trim().toLowerCase(),
        college_email: formData.college_email.trim().toLowerCase(),
        alumni_screenshot_url: fileUrl
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
        // Handle API errors
        if (response.status === 409 || result.duplicate) {
          throw new Error('A form with this registration number already exists. Redirecting to status page...');
        }
        throw new Error(result.error || 'Failed to submit form');
      }

      if (!result.data) {
        throw new Error('Failed to create form record');
      }

      setFormId(result.data.id);
      setSuccess(true);

      console.log('✅ Form submitted successfully:', result.data.id);

      // Redirect to status page after 3 seconds
      setTimeout(() => {
        router.push(`/student/check-status?reg=${sanitizedData.registration_no}`);
      }, 3000);

    } catch (err) {
      console.error('Form submission error:', err);
      
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`max-w-md mx-auto text-center p-8 rounded-xl backdrop-blur-md transition-all duration-700
          ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-black/10 shadow-lg'}`}
      >
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h2 className={`text-2xl font-serif mb-2 transition-colors duration-700
          ${isDark ? 'text-white' : 'text-ink-black'}`}>
          Form Submitted Successfully!
        </h2>
        <p className={`text-sm mb-6 transition-colors duration-700
          ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Your no dues application has been submitted. You can track its status using your registration number.
        </p>
        <div className={`inline-flex items-center gap-2 text-sm transition-colors duration-700
          ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Redirecting to status page...
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
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

      {/* Registration Number with Check Button */}
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 100 }}
      >
        <div className="flex-1">
          <FormInput
            label="Registration Number"
            name="registration_no"
            value={formData.registration_no}
            onChange={handleInputChange}
            required
            placeholder="e.g., 2021A1234"
            disabled={loading}
          />
        </div>
        <button
          type="button"
          onClick={checkExistingForm}
          disabled={checking || !formData.registration_no}
          className={`mt-8 px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center gap-2
            ${isDark
              ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              : 'bg-gray-100 hover:bg-gray-200 text-ink-black border border-black/10'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {checking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking...
            </>
          ) : (
            'Check'
          )}
        </button>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 100 }}
      >
        <FormInput
          label="Student Name"
          name="student_name"
          value={formData.student_name}
          onChange={handleInputChange}
          required
          placeholder="Full Name"
          disabled={loading}
        />

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
        />

        <FormInput
          label="Admission Year (YYYY)"
          name="session_from"
          value={formData.session_from}
          onChange={handleInputChange}
          placeholder="e.g., 2020"
          maxLength={4}
          pattern="\d{4}"
          disabled={loading}
        />

        <FormInput
          label="Passing Year (YYYY)"
          name="session_to"
          value={formData.session_to}
          onChange={handleInputChange}
          placeholder="e.g., 2024"
          maxLength={4}
          pattern="\d{4}"
          disabled={loading}
        />

        <FormInput
          label="Parent Name"
          name="parent_name"
          value={formData.parent_name}
          onChange={handleInputChange}
          placeholder="Father's/Mother's Name"
          disabled={loading}
        />

        <FormInput
          label="School"
          name="school"
          type="select"
          value={formData.school}
          onChange={handleInputChange}
          required
          disabled={loading || configLoading}
          placeholder={configLoading ? "Loading schools..." : "Select School"}
          options={schools.map(s => ({ value: s.id, label: s.name }))}
        />

        <FormInput
          label="Course"
          name="course"
          type="select"
          value={formData.course}
          onChange={handleInputChange}
          required
          disabled={loading || configLoading || !formData.school}
          placeholder={
            !formData.school
              ? "Select a school first"
              : availableCourses.length === 0
                ? "No courses available"
                : "Select Course"
          }
          options={availableCourses.map(c => ({ value: c.id, label: c.name }))}
        />

        <FormInput
          label="Branch"
          name="branch"
          type="select"
          value={formData.branch}
          onChange={handleInputChange}
          required
          disabled={loading || configLoading || !formData.course}
          placeholder={
            !formData.course
              ? "Select a course first"
              : availableBranches.length === 0
                ? "No branches available"
                : "Select Branch"
          }
          options={availableBranches.map(b => ({ value: b.id, label: b.name }))}
        />
        
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
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6, type: "spring", stiffness: 100 }}
      >
        <FileUpload
          onFileSelect={setFile}
          accept="image/*"
          maxSize={5 * 1024 * 1024}
        />
      </motion.div>

      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 120 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={loading}
        className={`interactive w-full py-4 rounded-lg font-bold text-white transition-all duration-300 flex items-center justify-center gap-2
          bg-jecrc-red hover:bg-red-700 shadow-lg shadow-jecrc-red/20 hover:shadow-jecrc-red/40
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Form'
        )}
      </motion.button>
    </motion.form>
  );
}