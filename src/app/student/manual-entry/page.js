'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload, FileCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import FormInput from '@/components/student/FormInput';
import FileUpload from '@/components/student/FileUpload';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';

export default function ManualEntryPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState({
    registration_no: '',
    student_name: '',
    personal_email: '',
    college_email: '',
    session_from: '',
    session_to: '',
    parent_name: '',
    school: '',
    course: '',
    branch: '',
    country_code: '+91',
    contact_no: '',
    certificate_screenshot_url: ''
  });

  const [schools, setSchools] = useState([]);
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [countryCodes, setCountryCodes] = useState([]);
  
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch configuration data
  useState(() => {
    async function fetchConfig() {
      try {
        // Fetch schools
        const { data: schoolsData } = await supabase
          .from('config_schools')
          .select('*')
          .eq('is_active', true)
          .order('display_order');
        setSchools(schoolsData || []);

        // Fetch country codes
        const { data: codesData } = await supabase
          .from('config_country_codes')
          .select('*')
          .eq('is_active', true)
          .order('display_order');
        setCountryCodes(codesData || []);
      } catch (err) {
        console.error('Error fetching config:', err);
      }
    }
    fetchConfig();
  }, []);

  // Fetch courses when school changes
  const handleSchoolChange = async (schoolId, schoolName) => {
    setSelectedSchoolId(schoolId);
    setSelectedCourseId('');
    setSelectedBranchId('');
    setCourses([]);
    setBranches([]);
    
    setFormData(prev => ({
      ...prev,
      school: schoolName,
      course: '',
      branch: ''
    }));

    if (schoolId) {
      const { data } = await supabase
        .from('config_courses')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('display_order');
      setCourses(data || []);
    }
  };

  // Fetch branches when course changes
  const handleCourseChange = async (courseId, courseName) => {
    setSelectedCourseId(courseId);
    setSelectedBranchId('');
    setBranches([]);
    
    setFormData(prev => ({
      ...prev,
      course: courseName,
      branch: ''
    }));

    if (courseId) {
      const { data } = await supabase
        .from('config_branches')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('display_order');
      setBranches(data || []);
    }
  };

  const handleBranchChange = (branchId, branchName) => {
    setSelectedBranchId(branchId);
    setFormData(prev => ({
      ...prev,
      branch: branchName
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.certificate_screenshot_url) {
        throw new Error('Please upload your no-dues certificate');
      }

      // Submit to API
      const response = await fetch('/api/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          school_id: selectedSchoolId,
          course_id: selectedCourseId,
          branch_id: selectedBranchId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit manual entry');
      }

      setSubmitSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/student/check-status');
      }, 3000);

    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitSuccess) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`max-w-md w-full p-8 rounded-2xl text-center ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-black/10'
            }`}
          >
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-ink-black'}`}>
              Submission Successful!
            </h2>
            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Your manual entry has been submitted for admin review.
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Redirecting to status page...
            </p>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 bg-jecrc-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8 text-jecrc-red" />
            </div>
            <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${isDark ? 'text-white' : 'text-ink-black'}`}>
              Register Offline Certificate
            </h1>
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Already completed your no-dues offline? Register your certificate here.
            </p>
          </motion.div>

          {/* Info Alert */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-4 rounded-lg mb-6 ${
              isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-500 mb-1">Important Information</h3>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• This form is only for students who have <strong>already completed</strong> the no-dues process offline</li>
                  <li>• You must upload a clear photo/scan of your <strong>physical no-dues certificate</strong></li>
                  <li>• Admin will verify your certificate before approving the entry</li>
                  <li>• Once approved, it will appear in the system as a completed form</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className={`p-6 md:p-8 rounded-2xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-black/10'
            }`}
          >
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Registration Number */}
              <FormInput
                label="Registration Number"
                name="registration_no"
                value={formData.registration_no}
                onChange={(e) => setFormData(prev => ({ ...prev, registration_no: e.target.value }))}
                required
                placeholder="e.g., 20JEXXXX"
              />

              {/* Student Name */}
              <FormInput
                label="Student Name"
                name="student_name"
                value={formData.student_name}
                onChange={(e) => setFormData(prev => ({ ...prev, student_name: e.target.value }))}
                required
                placeholder="Full name as per records"
              />

              {/* Email Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <FormInput
                  label="Personal Email"
                  name="personal_email"
                  type="email"
                  value={formData.personal_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, personal_email: e.target.value }))}
                  required
                  placeholder="your.email@example.com"
                />
                <FormInput
                  label="College Email"
                  name="college_email"
                  type="email"
                  value={formData.college_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, college_email: e.target.value }))}
                  required
                  placeholder="rollno@jecrc.ac.in"
                />
              </div>

              {/* Session Years */}
              <div className="grid md:grid-cols-2 gap-4">
                <FormInput
                  label="Admission Year (YYYY)"
                  name="session_from"
                  value={formData.session_from}
                  onChange={(e) => setFormData(prev => ({ ...prev, session_from: e.target.value }))}
                  required
                  placeholder="2020"
                  pattern="\d{4}"
                  maxLength={4}
                />
                <FormInput
                  label="Passing Year (YYYY)"
                  name="session_to"
                  value={formData.session_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, session_to: e.target.value }))}
                  required
                  placeholder="2024"
                  pattern="\d{4}"
                  maxLength={4}
                />
              </div>

              {/* Parent Name */}
              <FormInput
                label="Parent/Guardian Name"
                name="parent_name"
                value={formData.parent_name}
                onChange={(e) => setFormData(prev => ({ ...prev, parent_name: e.target.value }))}
                placeholder="Parent or guardian name"
              />

              {/* School/Course/Branch Cascade */}
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    School <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => {
                      const school = schools.find(s => s.id === e.target.value);
                      handleSchoolChange(e.target.value, school?.name || '');
                    }}
                    required
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isDark
                        ? 'bg-white/5 border-white/10 text-white focus:border-jecrc-red'
                        : 'bg-white border-black/10 text-ink-black focus:border-jecrc-red'
                    }`}
                  >
                    <option value="">Select School</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                </div>

                {selectedSchoolId && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Course <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => {
                        const course = courses.find(c => c.id === e.target.value);
                        handleCourseChange(e.target.value, course?.name || '');
                      }}
                      required
                      className={`w-full px-4 py-3 rounded-lg border transition-all ${
                        isDark
                          ? 'bg-white/5 border-white/10 text-white focus:border-jecrc-red'
                          : 'bg-white border-black/10 text-ink-black focus:border-jecrc-red'
                      }`}
                    >
                      <option value="">Select Course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.name} ({course.level})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedCourseId && branches.length > 0 && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Branch/Specialization
                    </label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => {
                        const branch = branches.find(b => b.id === e.target.value);
                        handleBranchChange(e.target.value, branch?.name || '');
                      }}
                      className={`w-full px-4 py-3 rounded-lg border transition-all ${
                        isDark
                          ? 'bg-white/5 border-white/10 text-white focus:border-jecrc-red'
                          : 'bg-white border-black/10 text-ink-black focus:border-jecrc-red'
                      }`}
                    >
                      <option value="">Select Branch (Optional)</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Contact Number */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.country_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, country_code: e.target.value }))}
                    className={`px-3 py-3 rounded-lg border transition-all ${
                      isDark
                        ? 'bg-white/5 border-white/10 text-white'
                        : 'bg-white border-black/10 text-ink-black'
                    }`}
                  >
                    {countryCodes.map(code => (
                      <option key={code.id} value={code.dial_code}>
                        {code.country_code} {code.dial_code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={formData.contact_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_no: e.target.value }))}
                    required
                    placeholder="Phone number"
                    className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                      isDark
                        ? 'bg-white/5 border-white/10 text-white placeholder-gray-500'
                        : 'bg-white border-black/10 text-ink-black placeholder-gray-400'
                    }`}
                  />
                </div>
              </div>

              {/* Certificate Upload */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  No-Dues Certificate <span className="text-red-500">*</span>
                </label>
                <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Upload a clear photo or scan of your physical no-dues certificate
                </p>
                <FileUpload
                  label=""
                  accept="image/*,application/pdf"
                  onUploadComplete={(url) => setFormData(prev => ({ ...prev, certificate_screenshot_url: url }))}
                  bucket="manual-certificates"
                  existingUrl={formData.certificate_screenshot_url}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !formData.certificate_screenshot_url}
                className="w-full bg-jecrc-red hover:bg-red-700 text-white py-4 rounded-lg font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Submit for Review</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    </PageWrapper>
  );
}