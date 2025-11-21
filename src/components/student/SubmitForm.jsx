'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import FormInput from './FormInput';
import FileUpload from './FileUpload';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';

export default function SubmitForm() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState({
    registration_no: '',
    student_name: '',
    session_from: '',
    session_to: '',
    parent_name: '',
    school: 'Engineering',
    course: '',
    branch: '',
    contact_no: '',
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formId, setFormId] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      // Comprehensive validation
      if (!formData.registration_no?.trim()) {
        throw new Error('Registration number is required');
      }

      if (!formData.student_name?.trim()) {
        throw new Error('Student name is required');
      }

      if (!formData.school) {
        throw new Error('School selection is required');
      }

      // Validate registration number format (flexible for different formats)
      const regNoPattern = /^[A-Z0-9]{6,15}$/i;
      if (!regNoPattern.test(formData.registration_no.trim())) {
        throw new Error('Invalid registration number format. Use alphanumeric characters (6-15 characters)');
      }

      // Validate contact number
      if (!formData.contact_no?.trim()) {
        throw new Error('Contact number is required');
      }

      if (!/^\d{10}$/.test(formData.contact_no.trim())) {
        throw new Error('Contact number must be exactly 10 digits');
      }

      // Validate name format (no numbers or special characters except spaces, dots, hyphens)
      const namePattern = /^[A-Za-z\s.\-']+$/;
      if (!namePattern.test(formData.student_name.trim())) {
        throw new Error('Student name should only contain letters, spaces, dots, and hyphens');
      }

      if (formData.parent_name && !namePattern.test(formData.parent_name.trim())) {
        throw new Error('Parent name should only contain letters, spaces, dots, and hyphens');
      }

      // Validate session years if provided
      if (formData.session_from) {
        const yearPattern = /^\d{4}$/;
        if (!yearPattern.test(formData.session_from)) {
          throw new Error('Session from year must be in YYYY format');
        }
        const fromYear = parseInt(formData.session_from);
        if (fromYear < 1900 || fromYear > new Date().getFullYear() + 10) {
          throw new Error('Session from year is invalid');
        }
      }

      if (formData.session_to) {
        const yearPattern = /^\d{4}$/;
        if (!yearPattern.test(formData.session_to)) {
          throw new Error('Session to year must be in YYYY format');
        }
        const toYear = parseInt(formData.session_to);
        if (toYear < 1900 || toYear > new Date().getFullYear() + 10) {
          throw new Error('Session to year is invalid');
        }
        
        // Validate session range
        if (formData.session_from && toYear < parseInt(formData.session_from)) {
          throw new Error('Session to year must be greater than or equal to session from year');
        }
      }

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
      const sanitizedData = {
        registration_no: formData.registration_no.trim().toUpperCase(),
        student_name: formData.student_name.trim(),
        session_from: formData.session_from?.trim() || null,
        session_to: formData.session_to?.trim() || null,
        parent_name: formData.parent_name?.trim() || null,
        school: formData.school,
        course: formData.course?.trim() || null,
        branch: formData.branch?.trim() || null,
        contact_no: formData.contact_no.trim(),
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
    <form onSubmit={handleSubmit} className="space-y-6">
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
      <div className="flex gap-2">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput
          label="Student Name"
          name="student_name"
          value={formData.student_name}
          onChange={handleInputChange}
          required
          placeholder="Full Name"
          disabled={loading}
        />

        <FormInput
          label="Contact Number"
          name="contact_no"
          type="tel"
          value={formData.contact_no}
          onChange={handleInputChange}
          required
          placeholder="10-digit mobile number"
          disabled={loading}
        />

        <FormInput
          label="Session From"
          name="session_from"
          value={formData.session_from}
          onChange={handleInputChange}
          placeholder="e.g., 2021"
          disabled={loading}
        />

        <FormInput
          label="Session To"
          name="session_to"
          value={formData.session_to}
          onChange={handleInputChange}
          placeholder="e.g., 2025"
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
          disabled={loading}
          options={[
            { value: 'Engineering', label: 'Engineering' },
            { value: 'Management', label: 'Management' },
            { value: 'Law', label: 'Law' }
          ]}
        />

        <FormInput
          label="Course"
          name="course"
          value={formData.course}
          onChange={handleInputChange}
          placeholder="e.g., B.Tech"
          disabled={loading}
        />

        <FormInput
          label="Branch"
          name="branch"
          value={formData.branch}
          onChange={handleInputChange}
          placeholder="e.g., Computer Science"
          disabled={loading}
        />
      </div>

      <FileUpload
        onFileSelect={setFile}
        accept="image/*"
        maxSize={5 * 1024 * 1024}
      />

      <button
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
      </button>
    </form>
  );
}