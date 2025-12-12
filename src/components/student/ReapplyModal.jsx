'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import FormInput from './FormInput';
import { useFormConfig } from '@/hooks/useFormConfig';

// ESC key handler hook
function useEscapeKey(callback, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        callback();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [callback, enabled]);
}

export default function ReapplyModal({ 
  formData, 
  rejectedDepartments = [],
  onClose, 
  onSuccess 
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  
  // ESC key to close (only when not loading)
  useEscapeKey(onClose, !loading);
  
  const {
    schools,
    courses,
    branches,
    collegeDomain,
    countryCodes,
    loading: configLoading,
    getCoursesForSchool,
    getBranchesForCourse
  } = useFormConfig();

  const [editedData, setEditedData] = useState({
    student_name: formData.student_name || '',
    admission_year: formData.admission_year || '',
    passing_year: formData.passing_year || '',
    parent_name: formData.parent_name || '',
    school: formData.school_id || formData.school || '',
    course: formData.course_id || formData.course || '',
    branch: formData.branch_id || formData.branch || '',
    country_code: formData.country_code || '+91',
    contact_no: formData.contact_no || '',
    personal_email: formData.personal_email || '',
    college_email: formData.college_email || ''
  });

  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Update available courses when school changes
  useEffect(() => {
    if (editedData.school) {
      const coursesForSchool = getCoursesForSchool(editedData.school);
      setAvailableCourses(coursesForSchool);
      
      if (editedData.course && !coursesForSchool.find(c => c.id === editedData.course)) {
        setEditedData(prev => ({ ...prev, course: '', branch: '' }));
        setAvailableBranches([]);
      }
    } else {
      setAvailableCourses([]);
      setAvailableBranches([]);
    }
  }, [editedData.school, getCoursesForSchool]);

  // Update available branches when course changes
  useEffect(() => {
    if (editedData.course) {
      const branchesForCourse = getBranchesForCourse(editedData.course);
      setAvailableBranches(branchesForCourse);
      
      if (editedData.branch && !branchesForCourse.find(b => b.id === editedData.branch)) {
        setEditedData(prev => ({ ...prev, branch: '' }));
      }
    } else {
      setAvailableBranches([]);
    }
  }, [editedData.course, getBranchesForCourse]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'school') {
      setEditedData(prev => ({
        ...prev,
        [name]: value,
        course: '',
        branch: ''
      }));
    } else if (name === 'course') {
      setEditedData(prev => ({
        ...prev,
        [name]: value,
        branch: ''
      }));
    } else {
      setEditedData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    
    // Validation
    if (!replyMessage.trim()) {
      setError('Please provide a reply message explaining your corrections');
      return;
    }

    if (replyMessage.trim().length < 20) {
      setError('Reply message must be at least 20 characters');
      return;
    }

    // Validate required fields
    if (!editedData.student_name?.trim()) {
      setError('Student name is required');
      return;
    }

    if (!editedData.school || !editedData.course || !editedData.branch) {
      setError('School, Course, and Branch are required');
      return;
    }

    if (!editedData.personal_email?.trim() || !editedData.college_email?.trim()) {
      setError('Both email addresses are required');
      return;
    }

    if (!editedData.contact_no?.trim()) {
      setError('Contact number is required');
      return;
    }

    // Email format validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(editedData.personal_email)) {
      setError('Invalid personal email format');
      return;
    }

    if (!emailPattern.test(editedData.college_email)) {
      setError('Invalid college email format');
      return;
    }

    // College email domain check
    if (!editedData.college_email.toLowerCase().endsWith(collegeDomain.toLowerCase())) {
      setError(`College email must end with ${collegeDomain}`);
      return;
    }

    setLoading(true);

    try {
      // Prepare updated data (only send changed fields)
      const updatedFields = {};
      Object.keys(editedData).forEach(key => {
        const originalValue = formData[`${key}_id`] || formData[key];
        if (editedData[key] !== originalValue && editedData[key] !== '') {
          updatedFields[key] = editedData[key];
        }
      });

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/student/reapply', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_no: formData.registration_no,
          student_reply_message: replyMessage.trim(),
          updated_form_data: updatedFields
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit reapplication');
      }

      setSuccess(true);
      
      // Call success callback after short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result);
        }
      }, 2000);

    } catch (err) {
      console.error('Reapplication error:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out after 30 seconds. Please check your connection and try again.');
      } else {
        setError(err.message || 'Failed to submit reapplication. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9990] backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ willChange: 'opacity' }}
      >
        <motion.div
          className={`rounded-xl max-w-md w-full p-8 text-center transition-colors duration-700 ${
            isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-black/10'
          }`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        >
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h2 className={`text-2xl font-bold mb-2 transition-colors duration-700 ${
            isDark ? 'text-white' : 'text-ink-black'
          }`}>
            Reapplication Submitted!
          </h2>
          <p className={`text-sm transition-colors duration-700 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Your reapplication has been submitted successfully. The rejected departments will review it again.
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9990] backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ willChange: 'opacity' }}
      >
        <motion.div
          className={`rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col transition-colors duration-700 ${
            isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-black/10'
          }`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        >
          {/* Sticky Header */}
          <div className={`sticky top-0 z-10 flex justify-between items-start p-6 border-b transition-colors duration-700 ${
            isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-black/10'
          }`}>
            <div>
              <h2 className={`text-2xl font-bold transition-colors duration-700 ${
                isDark ? 'text-white' : 'text-ink-black'
              }`}>
                Reapply to No Dues
              </h2>
              <p className={`text-sm mt-1 transition-colors duration-700 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Registration No: <span className="font-mono font-bold text-jecrc-red">{formData.registration_no}</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              disabled={loading}
              className={`p-2 rounded-lg transition-colors duration-300 ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
              }`}
            >
              <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{error}</p>
              </motion.div>
            )}

            {/* Rejection Reasons */}
          <div className="mb-6">
            <h3 className={`font-bold mb-3 transition-colors duration-700 ${
              isDark ? 'text-white' : 'text-ink-black'
            }`}>
              Rejection Reasons:
            </h3>
            <div className="space-y-2">
              {rejectedDepartments.map((dept, index) => (
                <div key={index} className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                  <p className="font-medium text-red-400">{dept.display_name || dept.department_name}</p>
                  <p className="text-sm text-red-300 mt-1">{dept.rejection_reason}</p>
                  {dept.action_at && (
                    <p className={`text-xs mt-1 transition-colors duration-700 ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Rejected on {new Date(dept.action_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
            </div>

            {/* Reply Message */}
          <div className="mb-6">
            <label className={`block font-medium mb-2 transition-colors duration-700 ${
              isDark ? 'text-white' : 'text-ink-black'
            }`}>
              Your Response Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={replyMessage}
              onChange={(e) => {
                setReplyMessage(e.target.value);
                setError('');
              }}
              className={`w-full p-3 border rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-jecrc-red ${
                isDark
                  ? 'bg-white/10 border-white/20 text-white placeholder-gray-500'
                  : 'bg-white border-black/20 text-ink-black placeholder-gray-400'
              }`}
              rows="4"
              placeholder="Explain the corrections you've made and why you should be reconsidered (minimum 20 characters)..."
              disabled={loading}
              required
            />
            <p className={`text-xs mt-1 transition-colors duration-700 ${
              replyMessage.length < 20 ? 'text-red-400' : 'text-green-400'
            }`}>
              {replyMessage.length} / 20 characters minimum
            </p>
            </div>

            {/* Editable Form Fields */}
          <div className="mb-6">
            <h3 className={`font-bold mb-4 transition-colors duration-700 ${
              isDark ? 'text-white' : 'text-ink-black'
            }`}>
              Review and Edit Your Information:
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Student Name"
                name="student_name"
                value={editedData.student_name}
                onChange={handleInputChange}
                required
                disabled={loading || configLoading}
              />

              <FormInput
                label="Parent Name"
                name="parent_name"
                value={editedData.parent_name}
                onChange={handleInputChange}
                disabled={loading || configLoading}
              />

              <FormInput
                label="Admission Year"
                name="admission_year"
                value={editedData.admission_year}
                onChange={handleInputChange}
                placeholder="e.g., 2020"
                maxLength={4}
                pattern="\d{4}"
                disabled={loading || configLoading}
              />

              <FormInput
                label="Passing Year"
                name="passing_year"
                value={editedData.passing_year}
                onChange={handleInputChange}
                placeholder="e.g., 2024"
                maxLength={4}
                pattern="\d{4}"
                disabled={loading || configLoading}
              />

              <FormInput
                label="School"
                name="school"
                type="select"
                value={editedData.school}
                onChange={handleInputChange}
                required
                disabled={loading || configLoading}
                options={schools.map(s => ({ value: s.id, label: s.name }))}
              />

              <FormInput
                label="Course"
                name="course"
                type="select"
                value={editedData.course}
                onChange={handleInputChange}
                required
                disabled={loading || configLoading || !editedData.school}
                options={availableCourses.map(c => ({ value: c.id, label: c.name }))}
              />

              <FormInput
                label="Branch"
                name="branch"
                type="select"
                value={editedData.branch}
                onChange={handleInputChange}
                required
                disabled={loading || configLoading || !editedData.course}
                options={availableBranches.map(b => ({ value: b.id, label: b.name }))}
              />

              <FormInput
                label="Country Code"
                name="country_code"
                type="select"
                value={editedData.country_code}
                onChange={handleInputChange}
                required
                disabled={loading || configLoading}
                options={countryCodes.map(c => ({
                  value: c.dial_code,
                  label: `${c.country_name} (${c.dial_code})`
                }))}
              />

              <FormInput
                label="Contact Number"
                name="contact_no"
                type="tel"
                value={editedData.contact_no}
                onChange={handleInputChange}
                required
                placeholder="6-15 digits (without country code)"
                disabled={loading || configLoading}
              />

              <FormInput
                label="Personal Email"
                name="personal_email"
                type="email"
                value={editedData.personal_email}
                onChange={handleInputChange}
                required
                placeholder="your.email@example.com"
                disabled={loading || configLoading}
              />

              <FormInput
                label={`College Email (${collegeDomain})`}
                name="college_email"
                type="email"
                value={editedData.college_email}
                onChange={handleInputChange}
                required
                placeholder={`yourname${collegeDomain}`}
                disabled={loading || configLoading}
              />
            </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className={`sticky bottom-0 z-10 p-6 border-t transition-colors duration-700 ${
            isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-black/10'
          }`}>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-ink-black'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !replyMessage.trim() || replyMessage.length < 20}
              className="px-6 py-3 bg-jecrc-red hover:bg-red-700 text-white rounded-lg font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Reapplication
                </>
              )}
            </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}