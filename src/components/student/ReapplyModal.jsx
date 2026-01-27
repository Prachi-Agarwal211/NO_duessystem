'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import Input from '@/components/ui/Input';
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
  selectedDepartment = null,  // NEW: If set, reapply to this single department only
  onClose,
  onSuccess
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Determine which departments to show based on mode
  const isPerDeptMode = selectedDepartment !== null;
  const displayDepartments = isPerDeptMode ? [selectedDepartment] : rejectedDepartments;

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

  // State declarations MUST come before any usage
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

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // ESC key to close (only when not loading)
  useEscapeKey(onClose, !loading);

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

    // Validation - only check reply message since form fields are read-only
    if (!replyMessage.trim() || replyMessage.trim().length < 5) {
      setError('Please provide a reply message (minimum 5 characters)');
      return;
    }

    setLoading(true);

    try {
      // No form data changes allowed during reapplication
      const updatedFields = {};


      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response;

      if (isPerDeptMode) {
        // Per-department reapplication
        response = await fetch('/api/student/reapply/department', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registration_no: formData.registration_no,
            department_name: selectedDepartment.department_name,
            student_reply_message: replyMessage.trim(),
            updated_form_data: updatedFields
          }),
          signal: controller.signal
        });
      } else {
        // All-departments reapplication (original behavior)
        // Build a list of rejected department names
        const rejectedDeptNames = rejectedDepartments.map(d => d.department_name).join(', ');

        response = await fetch('/api/student/reapply', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            form_id: formData.id,
            registration_no: formData.registration_no,
            reapplication_reason: replyMessage.trim(),
            department: rejectedDeptNames, // All rejected departments
            updated_form_data: updatedFields
          }),
          signal: controller.signal
        });
      }

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit reapplication');
      }

      setSuccess(true);

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result);
        }
      }, 1500);

    } catch (err) {
      console.error('Reapplication error:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError(err.message || 'Failed to submit. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9990] backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ willChange: 'opacity' }}
      >
        <motion.div
          className={`
            rounded-xl max-w-md w-full p-6 sm:p-8 text-center
            ${isDark
              ? 'bg-gradient-to-br from-gray-900 to-black border border-white/10'
              : 'bg-white border border-gray-200'
            }
          `}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center"
          >
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </motion.div>
          <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Reapplication Submitted!
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {isPerDeptMode
              ? `Your reapplication to ${selectedDepartment?.display_name || selectedDepartment?.department_name} has been submitted.`
              : 'Your reapplication has been submitted. The rejected departments will review it again.'
            }
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9990] backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ willChange: 'opacity' }}
      >
        <motion.div
          className={`
            rounded-xl w-full max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col
            ${isDark
              ? 'bg-gradient-to-br from-gray-900 to-black border border-white/10'
              : 'bg-white border border-gray-200'
            }
          `}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        >
          {/* Sticky Header */}
          <div className={`
            sticky top-0 z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6 border-b
            ${isDark ? 'bg-gray-900/95 border-white/10' : 'bg-white/95 border-gray-200'}
          `}>
            <div>
              <h2 className={`text-lg sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isPerDeptMode
                  ? `Reapply to ${selectedDepartment?.display_name || selectedDepartment?.department_name}`
                  : 'Reapply to All Departments'
                }
              </h2>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Registration No: <span className="font-mono font-bold text-jecrc-red">{formData.registration_no}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`
                p-2 rounded-lg transition-all duration-300
                ${isDark
                  ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                  : 'hover:bg-black/5 text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`
                    mb-6 p-4 rounded-lg flex items-start gap-3
                    ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}
                `}
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
              </motion.div>
            )}

            {/* Rejection Reasons */}
            <div className="mb-6">
              <h3 className={`font-bold mb-3 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                }`}>
                {isPerDeptMode ? 'Rejection Reason:' : 'Rejection Reasons:'}
              </h3>
              <div className="space-y-2">
                {displayDepartments.map((dept, index) => (
                  <div key={dept.department_name || index} className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                    <p className="font-medium text-red-400">{dept.display_name || dept.department_name}</p>
                    <p className="text-sm text-red-300 mt-1">{dept.rejection_reason}</p>
                    {dept.action_at && (
                      <p className={`text-xs mt-1 transition-colors duration-700 ${isDark ? 'text-gray-500' : 'text-gray-400'
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
              <label className={`block font-medium mb-2 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                }`}>
                Your Response Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={replyMessage}
                onChange={(e) => {
                  setReplyMessage(e.target.value);
                  setError('');
                }}
                className={`w-full p-3 border rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-600 ${isDark
                  ? 'bg-white/10 border-white/20 text-white placeholder-gray-500'
                  : 'bg-white border-black/20 text-ink-black placeholder-gray-400'
                  }`}
                rows="4"
                placeholder="Explain the corrections you've made and why you should be reconsidered..."
                disabled={loading}
                required
              />
              <p className={`text-xs mt-1 transition-colors duration-700 ${isDark ? 'text-gray-500' : 'text-gray-400'
                }`}>
                {replyMessage.length} characters
              </p>
            </div>

            {/* Read-Only Form Information */}
            <div className="mb-6">
              <h3 className={`font-bold mb-2 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                }`}>
                Your Submitted Information:
              </h3>
              <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Form data cannot be edited during reapplication. If you need to change any information, please contact administration.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Student Name"
                  name="student_name"
                  value={editedData.student_name}
                  disabled={true}
                  readOnly
                />

                <Input
                  label="Parent Name"
                  name="parent_name"
                  value={editedData.parent_name}
                  disabled={true}
                  readOnly
                />

                <Input
                  label="Admission Year"
                  name="admission_year"
                  value={editedData.admission_year}
                  disabled={true}
                  readOnly
                />

                <Input
                  label="Passing Year"
                  name="passing_year"
                  value={editedData.passing_year}
                  disabled={true}
                  readOnly
                />

                <Input
                  label="School"
                  name="school"
                  value={schools.find(s => s.id === editedData.school)?.name || editedData.school || 'N/A'}
                  disabled={true}
                  readOnly
                />

                <Input
                  label="Course"
                  name="course"
                  value={availableCourses.find(c => c.id === editedData.course)?.name || editedData.course || 'N/A'}
                  disabled={true}
                  readOnly
                />

                <Input
                  label="Branch"
                  name="branch"
                  value={availableBranches.find(b => b.id === editedData.branch)?.name || editedData.branch || 'N/A'}
                  disabled={true}
                  readOnly
                />

                <Input
                  label="Country Code"
                  name="country_code"
                  value={editedData.country_code}
                  disabled={true}
                  readOnly
                />

                <Input
                  label="Contact Number"
                  name="contact_no"
                  value={editedData.contact_no}
                  disabled={true}
                  readOnly
                />

                <Input
                  label="Personal Email"
                  name="personal_email"
                  value={editedData.personal_email}
                  disabled={true}
                  readOnly
                />

                <Input
                  label={`College Email (${collegeDomain})`}
                  name="college_email"
                  value={editedData.college_email}
                  disabled={true}
                  readOnly
                />
              </div>
            </div>

          </div>

          {/* Sticky Footer */}
          <div className={`sticky bottom-0 z-10 p-6 border-t transition-colors duration-700 ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-black/10'
            }`}>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-ink-black'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !replyMessage.trim()}
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