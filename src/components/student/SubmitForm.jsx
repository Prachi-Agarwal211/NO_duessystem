'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, Check, X, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

import { useTheme } from '@/contexts/ThemeContext';
// import { supabase } from '@/lib/supabaseClient'; // Not using file upload anymore
import { useFormConfig } from '@/hooks/useFormConfig';
import { DropdownWithErrorBoundary } from '@/components/ui/DropdownErrorBoundary';
import { createLogger } from '@/lib/errorLogger';

const logger = createLogger('SubmitForm');

export default function SubmitForm() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Load dynamic configuration
  const {
    schools,
    courses,
    branches,
    collegeDomain,
    countryCodes,
    loading: configLoading,
    coursesLoading,
    branchesLoading,
    fetchCoursesBySchool,
    fetchBranchesByCourse
  } = useFormConfig();

  const [formData, setFormData] = useState({
    registration_no: '',
    student_name: '',
    admission_year: '',
    passing_year: '',
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

  // Ref to prevent useEffects from resetting values during auto-fill
  const isAutoFilling = useRef(false);

  // Update available courses when school changes (only when user manually selects)
  useEffect(() => {
    // Skip entirely during auto-fill - we handle loading in fetchStudentData
    if (isAutoFilling.current) return;

    const loadCourses = async () => {
      if (formData.school) {
        const coursesForSchool = await fetchCoursesBySchool(formData.school);
        setAvailableCourses(coursesForSchool);
        // Reset course/branch when user manually changes school
        setFormData(prev => ({ ...prev, course: '', branch: '' }));
        setAvailableBranches([]);
      } else {
        setAvailableCourses([]);
        setAvailableBranches([]);
      }
    };
    loadCourses();
  }, [formData.school, fetchCoursesBySchool]);

  // Update available branches when course changes (only when user manually selects)
  useEffect(() => {
    // Skip entirely during auto-fill - we handle loading in fetchStudentData
    if (isAutoFilling.current) return;

    const loadBranches = async () => {
      if (formData.course) {
        const branchesForCourse = await fetchBranchesByCourse(formData.course);
        setAvailableBranches(branchesForCourse);
        // Reset branch when user manually changes course
        setFormData(prev => ({ ...prev, branch: '' }));
      } else {
        setAvailableBranches([]);
      }
    };
    loadBranches();
  }, [formData.course, fetchBranchesByCourse]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'school') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        course: '',
        branch: ''
      }));
    } else if (name === 'course') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        branch: ''
      }));
    } else if (name === 'registration_no') {
      // Auto-convert to uppercase as user types
      setFormData(prev => ({
        ...prev,
        [name]: value.toUpperCase()
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
      const response = await fetch(`/api/student/can-edit?registration_no=${encodeURIComponent(formData.registration_no.trim().toUpperCase())}`);
      const result = await response.json();

      if (response.status === 404 || result.error === 'Form not found') {
        setError('');
        toast.success('✅ No existing form found. You can proceed.');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to check form status');
      }

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

  const fetchStudentData = async (registrationNo) => {
    if (!registrationNo) {
      setStudentFetchError('Please enter registration number first');
      return;
    }

    setFetchingStudent(true);
    setStudentFetchError('');
    setStudentDataFound(null);

    // Set flag to prevent useEffects from resetting dropdown values
    isAutoFilling.current = true;

    try {
      const response = await fetch(`/api/student/lookup?registration_no=${encodeURIComponent(registrationNo.trim().toUpperCase())}`);
      const result = await response.json();

      if (response.ok && result.success) {
        const studentData = result.data;

        if (studentData.no_dues_status === 'pending') {
          toast.info('⚠️ You already have a pending application.');
        } else if (studentData.no_dues_status === 'completed') {
          toast.success('✅ Your No Dues process is already completed.');
        }

        // Find matching school ID from name
        let schoolId = '';
        let courseId = '';
        let branchId = '';

        // Try to find school by name or use ID if already provided
        if (studentData.school) {
          const matchedSchool = schools.find(s =>
            s.name === studentData.school || s.id === studentData.school
          );
          if (matchedSchool) {
            schoolId = matchedSchool.id;
          }
        }

        // Load courses for the school and find matching course
        let loadedCourses = [];
        if (schoolId) {
          loadedCourses = await fetchCoursesBySchool(schoolId);
          setAvailableCourses(loadedCourses);

          if (studentData.course) {
            const matchedCourse = loadedCourses.find(c =>
              c.name === studentData.course || c.id === studentData.course
            );
            if (matchedCourse) {
              courseId = matchedCourse.id;
            }
          }
        }

        // Load branches for the course and find matching branch
        let loadedBranches = [];
        if (courseId) {
          loadedBranches = await fetchBranchesByCourse(courseId);
          setAvailableBranches(loadedBranches);

          if (studentData.branch) {
            const matchedBranch = loadedBranches.find(b =>
              b.name === studentData.branch || b.id === studentData.branch
            );
            if (matchedBranch) {
              branchId = matchedBranch.id;
            }
          }
        }

        // Set form data with resolved IDs
        setFormData(prev => ({
          ...prev,
          student_name: studentData.student_name || prev.student_name,
          admission_year: studentData.admission_year || prev.admission_year,
          passing_year: studentData.passing_year || prev.passing_year,
          parent_name: studentData.parent_name || prev.parent_name,
          school: schoolId || prev.school,
          course: courseId || prev.course,
          branch: branchId || prev.branch,
          country_code: studentData.country_code || prev.country_code,
          contact_no: studentData.contact_no || prev.contact_no,
          personal_email: studentData.personal_email || prev.personal_email,
          college_email: studentData.college_email || prev.college_email,
          alumni_profile_link: studentData.alumni_profile_link || prev.alumni_profile_link
        }));

        setStudentDataFound(studentData);
        setError('');

        // Show success message with details
        if (schoolId && courseId && branchId) {
          toast.success('✅ All details auto-filled successfully!');
        } else if (schoolId) {
          toast.info('⚠️ Some dropdown values could not be matched. Please verify.');
        }
      } else {
        setStudentFetchError(result.message || 'Student not found in database');
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
      setStudentFetchError('Failed to fetch student data.');
    } finally {
      setFetchingStudent(false);
      // Reset the auto-filling flag after a short delay to ensure React has processed all state updates
      setTimeout(() => {
        isAutoFilling.current = false;
      }, 100);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validations
      if (!formData.registration_no?.trim()) throw new Error('Registration number is required');
      if (!formData.student_name?.trim()) throw new Error('Student name is required');
      if (!formData.school) throw new Error('School selection is required');
      if (!formData.course) throw new Error('Course selection is required');
      if (!formData.branch) throw new Error('Branch selection is required');
      if (!formData.personal_email?.trim()) throw new Error('Personal email is required');
      if (!formData.college_email?.trim()) throw new Error('College email is required');
      if (!formData.contact_no?.trim()) throw new Error('Contact number is required');

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.personal_email.trim())) throw new Error('Invalid personal email format');
      if (!emailPattern.test(formData.college_email.trim())) throw new Error('Invalid college email format');
      if (collegeDomain && !formData.college_email.toLowerCase().endsWith(collegeDomain.toLowerCase())) {
        throw new Error(`College email must end with ${collegeDomain}`);
      }

      const sanitizedData = {
        registration_no: formData.registration_no.trim().toUpperCase(),
        student_name: formData.student_name.trim(),
        admission_year: formData.admission_year?.trim() || null,
        passing_year: formData.passing_year?.trim() || null,
        parent_name: formData.parent_name?.trim() || null,
        school: formData.school,
        course: formData.course,
        branch: formData.branch,
        country_code: formData.country_code,
        contact_no: formData.contact_no.trim(),
        personal_email: formData.personal_email.trim().toLowerCase(),
        college_email: formData.college_email.trim().toLowerCase(),
        alumni_profile_link: (formData.alumni_profile_link || '').trim()
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/student/prisma-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok || !result.success) {
        if (response.status === 409 || result.duplicate) {
          throw new Error('Form already exists. Redirecting...');
        }
        throw new Error(result.error || 'Failed to submit form');
      }

      setFormId(result.data.id);
      setSuccess(true);

      setTimeout(() => {
        router.push(`/student/check-status?reg=${sanitizedData.registration_no}`);
      }, 3000);

    } catch (err) {
      console.error(err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
      if (err.message && err.message.includes('already exists')) {
        setTimeout(() => {
          router.push(`/student/check-status?reg=${formData.registration_no.toUpperCase()}`);
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`max-w-lg mx-auto text-center p-8 sm:p-12 rounded-3xl shadow-2xl ${isDark ? 'bg-gradient-to-br from-gray-900 to-black border border-white/10' : 'bg-white border border-gray-100'
          }`}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center"
        >
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
        </motion.div>
        <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Application Submitted!
        </h2>
        <p className={`text-sm sm:text-base mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Your no dues application has been successfully recorded.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => router.push(`/student/check-status?reg=${formData.registration_no}`)}>
            Track Status
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6 sm:space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Instructions Pane - Restored similar to legacy */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          p-6 rounded-xl border
          ${isDark
            ? 'bg-blue-900/10 border-blue-500/20'
            : 'bg-blue-100/30 border-blue-200'
          }
        `}
      >
        <h3 className={`font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
          <Info className="w-5 h-5" />
          Instructions
        </h3>
        <ul className={`space-y-2 text-sm list-disc pl-5 ${isDark ? 'text-blue-200' : 'text-blue-600'}`}>
          <li>Fields marked <span className="text-red-500">*</span> are mandatory.</li>
          <li>Ensure details match official college records.</li>
          <li>Register at <a href="https://jualumni.in" target="_blank" className="underline font-bold hover:text-jecrc-red transition-colors">jualumni.in</a> and obtain your <strong>Profile Link</strong> (from the Profile section) before applying.</li>
        </ul>
      </motion.div>

      {error && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex gap-3 ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      {/* Legacy Arrangement: Registration Top, then Grid */}
      <div className="space-y-4">
        <Input
          label="Registration Number"
          name="registration_no"
          value={formData.registration_no}
          onChange={handleInputChange}
          required
          placeholder="e.g., 22BCAN001"
          disabled={loading}
          // Error handling for student fetch
          error={studentFetchError}
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => fetchStudentData(formData.registration_no)}
            disabled={fetchingStudent || !formData.registration_no}
            loading={fetchingStudent}
            className="w-full sm:w-auto h-[50px]"
          >
            {!fetchingStudent && "Auto-Fill details"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={checkExistingForm}
            disabled={checking || !formData.registration_no}
            loading={checking}
            className="w-full sm:w-auto h-[50px]"
          >
            {!checking && "Check Status"}
          </Button>
        </div>

        {/* Success/Error Message for Auto-Fill */}
        {(studentDataFound) && (
          <div className={`p-3 rounded-lg text-sm flex gap-2 items-center ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'}`}>
            <Check className="w-4 h-4" /> Found: {studentDataFound.student_name}
          </div>
        )}
      </div>

      {/* MAIN GRID LAYOUT - Restored Legacy density */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Input
          label="Student Name"
          name="student_name"
          value={formData.student_name}
          onChange={handleInputChange}
          required
          disabled={loading}
          placeholder="Enter your full name as per records"
        />

        <Input
          label="Country Code"
          name="country_code"
          type="select"
          value={formData.country_code}
          onChange={handleInputChange}
          required
          disabled={loading}
          options={countryCodes.map(c => ({ value: c.dial_code, label: `${c.country_name} (${c.dial_code})` }))}
        />

        <Input
          label="Contact Number"
          name="contact_no"
          type="tel"
          value={formData.contact_no}
          onChange={handleInputChange}
          required
          disabled={loading}
          placeholder="e.g. 9876543210"
        />

        <Input
          label="Personal Email"
          name="personal_email"
          type="email"
          value={formData.personal_email}
          onChange={handleInputChange}
          required
          disabled={loading}
          placeholder="e.g. student@gmail.com"
        />
        {/* Note: Legacy might have had College Email in grid, but usually emails are long, span-2 looks better on laptop. Legacy was 2-col? Let's stick to strict 2-col unless it overflows. I'll make it span-2 for better laptop UI as requested "laptop friendly". */}

        <Input
          label="College Email"
          name="college_email"
          type="email"
          value={formData.college_email}
          onChange={handleInputChange}
          required
          disabled={loading}
          className="md:col-span-2"
          placeholder="e.g. student.id@jecrc.ac.in"
        />

        <Input
          label="Admission Year"
          name="admission_year"
          value={formData.admission_year}
          onChange={handleInputChange}
          required
          disabled={loading}
          placeholder="e.g. 2022"
        />

        <Input
          label="Passing Year"
          name="passing_year"
          value={formData.passing_year}
          onChange={handleInputChange}
          required
          disabled={loading}
          placeholder="e.g. 2026"
        />

        <div className="md:col-span-2">
          <Input
            label="Parent Name"
            name="parent_name"
            value={formData.parent_name}
            onChange={handleInputChange}
            required
            disabled={loading}
            placeholder="Enter Father's or Mother's Name"
          />
        </div>

        <div className="md:col-span-2">
          <DropdownWithErrorBoundary componentName="SchoolDropdown" onReset={() => window.location.reload()}>
            <Input
              label="School"
              name="school"
              type="select"
              value={formData.school}
              onChange={handleInputChange}
              required
              disabled={loading || configLoading}
              options={schools.map(s => ({ value: s.id, label: s.name }))}
            />
          </DropdownWithErrorBoundary>
        </div>

        <DropdownWithErrorBoundary componentName="CourseDropdown">
          <Input
            label="Course"
            name="course"
            type="select"
            value={formData.course}
            onChange={handleInputChange}
            required
            disabled={loading || !formData.school}
            options={availableCourses.map(c => ({ value: c.id, label: c.name }))}
          />
        </DropdownWithErrorBoundary>

        <DropdownWithErrorBoundary componentName="BranchDropdown">
          <Input
            label="Branch"
            name="branch"
            type="select"
            value={formData.branch}
            onChange={handleInputChange}
            required
            disabled={loading || !formData.course}
            options={availableBranches.map(b => ({ value: b.id, label: b.name }))}
          />
        </DropdownWithErrorBoundary>

        <div className="md:col-span-2">
          <Input
            label="JU Alumni Profile Link"
            name="alumni_profile_link"
            value={formData.alumni_profile_link}
            onChange={handleInputChange}
            required
            disabled={loading}
            placeholder="e.g. https://jualumni.in/p/username or https://jualumni.in/profile/123456"
            description={
              <span>
                Go to <a href="https://jualumni.in" target="_blank" className="underline hover:text-jecrc-red">JU Alumni</a> → <strong>Profile</strong> section → Copy the link from browser address bar
              </span>
            }
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Button
          type="submit"
          disabled={loading}
          loading={loading}
          className="w-full sm:w-auto px-10 py-4 text-lg font-bold shadow-xl shadow-red-500/20"
        >
          Submit Application
        </Button>
      </div>
    </motion.form>
  );
}