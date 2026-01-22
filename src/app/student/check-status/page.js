'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, memo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, AlertCircle, FileText, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import PageWrapper from '@/components/landing/PageWrapper';
import Input from '@/components/ui/Input';

import StatusTracker from '@/components/student/StatusTracker';
import Logo from '@/components/ui/Logo';
import { useTheme } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Memoized student info card for performance
const StudentInfoCard = memo(({ formData, isDark, onReset }) => (
  <div className="glass-card p-6 rounded-2xl border border-white/20 dark:border-gray-700/50 mb-6">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Registration Number</p>
        <p className="font-mono text-2xl font-bold text-jecrc-red">{formData.registration_no}</p>
      </div>
      <motion.button
        onClick={onReset}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-manrope font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-700 active:scale-95"
      >
        Check Another
      </motion.button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
      {/* Student Name */}
      <div>
        <p className="text-gray-500 dark:text-gray-400 mb-1">Student Name</p>
        <p className="font-medium text-gray-900 dark:text-white">{formData.student_name}</p>
      </div>

      {/* Parent Name */}
      {formData.parent_name && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">Parent Name</p>
          <p className="font-medium text-gray-900 dark:text-white">{formData.parent_name}</p>
        </div>
      )}

      {/* Contact Number */}
      {formData.contact_no && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">Contact Number</p>
          <p className="font-medium text-gray-900 dark:text-white font-mono">{formData.contact_no}</p>
        </div>
      )}

      {/* Personal Email */}
      {formData.personal_email && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">Personal Email</p>
          <p className="font-medium text-gray-900 dark:text-white text-xs break-all">{formData.personal_email}</p>
        </div>
      )}

      {/* College Email */}
      {formData.college_email && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">College Email</p>
          <p className="font-medium text-gray-900 dark:text-white text-xs break-all">{formData.college_email}</p>
        </div>
      )}

      {/* School */}
      {formData.school && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">School</p>
          <p className="font-medium text-gray-900 dark:text-white">{formData.school}</p>
        </div>
      )}

      {/* Course */}
      {formData.course && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">Course</p>
          <p className="font-medium text-gray-900 dark:text-white">{formData.course}</p>
        </div>
      )}

      {/* Branch */}
      {formData.branch && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">Branch</p>
          <p className="font-medium text-gray-900 dark:text-white">{formData.branch}</p>
        </div>
      )}

      {/* Admission Year */}
      {formData.admission_year && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">Admission Year</p>
          <p className="font-medium text-gray-900 dark:text-white">{formData.admission_year}</p>
        </div>
      )}

      {/* Passing Year */}
      {formData.passing_year && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">Passing Year</p>
          <p className="font-medium text-gray-900 dark:text-white">{formData.passing_year}</p>
        </div>
      )}

      {/* Submitted Date */}
      {formData.submitted_at && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">Submitted On</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {new Date(formData.submitted_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
      )}

      {/* Application Status */}
      {formData.status && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">Application Status</p>
          <p className="font-medium text-gray-900 dark:text-white">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
              ${formData.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                formData.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                  formData.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
              }`}>
              {formData.status}
            </span>
          </p>
        </div>
      )}
    </div>
  </div>
));
StudentInfoCard.displayName = 'StudentInfoCard';

function CheckStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  // ✅ Handle null theme safely (defaults to dark mode)
  const isDark = theme === 'dark' || theme === null;
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // ✅ Optimized API call with useCallback to prevent recreation
  const performSearch = useCallback(async (regNo) => {
    const searchRegNo = (regNo || registrationNumber).trim();

    // Validation
    if (!searchRegNo) {
      setError('Please enter a registration number');
      return;
    }

    // Validate format (alphanumeric, 6-15 characters)
    const regNoPattern = /^[A-Z0-9]{6,15}$/i;
    if (!regNoPattern.test(searchRegNo)) {
      setError('Invalid registration number format. Use alphanumeric characters (6-15 characters)');
      return;
    }

    setLoading(true);
    setError('');
    setNotFound(false);
    setFormData(null);

    try {
      // ✅ Call API route instead of direct Supabase query
      const response = await fetch(
        `/api/check-status?registration_no=${encodeURIComponent(searchRegNo.toUpperCase())}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // Handle different error codes
        if (response.status === 404) {
          setNotFound(true);
          return;
        }

        // Show user-friendly error message
        throw new Error(result.error || 'Failed to fetch status');
      }

      // Success - check if form was found
      if (result.success && result.data) {
        setFormData(result.data.form);
        // Update URL with registration number for persistence on refresh
        router.replace(`/student/check-status?reg=${searchRegNo.toUpperCase()}`, { scroll: false });
      } else {
        setNotFound(true);
      }

    } catch (err) {
      console.error('Error fetching form:', err);

      // User-friendly error messages
      let errorMessage = 'Failed to fetch status. Please try again.';

      if (err.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [registrationNumber, router]);

  // Auto-search if registration number is in URL (for refresh persistence)
  useEffect(() => {
    const regFromUrl = searchParams.get('reg');
    if (regFromUrl && !formData && !loading) {
      setRegistrationNumber(regFromUrl.toUpperCase());
      performSearch(regFromUrl.toUpperCase());
    }
    // ✅ Only depend on searchParams to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    await performSearch();
  }, [performSearch]);

  const handleReset = useCallback(() => {
    setRegistrationNumber('');
    setFormData(null);
    setNotFound(false);
    setError('');
    router.replace('/student/check-status', { scroll: false });
  }, [router]);

  return (
    <PageWrapper>
      <div className="relative z-10 min-h-screen pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => router.push('/')}
            className={`interactive mb-8 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-700 ease-smooth backdrop-blur-md active:scale-95
              ${isDark
                ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
                : 'text-gray-600 hover:text-black bg-white hover:bg-gray-50 border border-black/10'
              }`}
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Home</span>
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center mb-12"
          >
            <div className="flex flex-col items-center mb-6">
              <Logo size="medium" />
            </div>
            <h1 className={`font-serif text-4xl md:text-5xl font-bold mb-4 transition-all duration-700
              ${isDark
                ? 'bg-gradient-to-r from-jecrc-red via-white to-red-400 bg-clip-text text-transparent [text-shadow:0_0_30px_rgba(255,255,255,0.3)]'
                : 'bg-gradient-to-r from-[#8B0000] via-jecrc-red to-gray-900 bg-clip-text text-transparent'
              }`}>
              Check No Dues Form Status
            </h1>
            <p className={`text-lg max-w-2xl mx-auto transition-colors duration-700
              ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Enter your registration number to view the current status of your No Dues application
            </p>
          </motion.div>

          {/* Search Form */}
          {!formData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Instructions Card */}
              <div className={`rounded-2xl border p-6 transition-all duration-700 ${isDark
                ? 'bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/20'
                : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                    }`}>
                    <Info className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`
                      font-bold text-lg mb-3 font-serif
                      bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400
                      bg-clip-text text-transparent
                    `}>
                      Important Instructions
                    </h3>
                    <ul className="space-y-2">
                      {[
                        'Enter your registration number exactly as it appears on your ID card',
                        'Status updates may take 24-48 hours after department verification',
                        'If rejected, you can reapply after addressing the mentioned concerns',
                        'Download your No Dues Certificate once all departments approve',
                        'For any queries, contact the respective department or support'
                      ].map((instruction, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'
                            }`} />
                          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            {instruction}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Search Form Card */}
              <div className="glass-card p-8 rounded-2xl border border-white/20 dark:border-gray-700/50">
                <form onSubmit={handleSearch} className="space-y-6">
                  <Input
                    label="Registration Number"
                    name="registrationNumber"
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., 21EJECS001"
                    error={error}
                    disabled={loading}
                    endIcon={<Search className="w-5 h-5" />}
                  />

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-gradient-to-r from-jecrc-red to-jecrc-red/80 text-white rounded-xl font-manrope font-semibold hover:shadow-xl hover:shadow-jecrc-red/25 transition-all duration-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Check Status
                      </>
                    )}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Not Found Message */}
          {notFound && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="glass-card p-8 rounded-2xl border border-orange-500/20 dark:border-orange-400/20 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className={`font-serif text-2xl font-bold mb-3 transition-all duration-700
                ${isDark
                  ? 'bg-gradient-to-r from-white via-red-300 to-orange-400 bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-[#8B0000] to-orange-600 bg-clip-text text-transparent'
                }`}>
                No Application Found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We couldn't find a No Dues application with registration number{' '}
                <span className="font-mono font-bold text-jecrc-red">{registrationNumber}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  onClick={handleReset}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-manrope font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-700"
                >
                  Try Again
                </motion.button>
                <Link href="/student/submit-form">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gradient-to-r from-jecrc-red to-jecrc-red/80 text-white rounded-xl font-manrope font-semibold hover:shadow-xl hover:shadow-jecrc-red/25 transition-all duration-700 flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Submit Application
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Status Tracker - Optimized with memoization */}
          {formData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <StudentInfoCard
                formData={formData}
                isDark={isDark}
                onReset={handleReset}
              />

              <StatusTracker
                formId={formData.id}
                registrationNo={formData.registration_no}
              />
            </motion.div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

import StudentAuthGuard from '@/components/student/StudentAuthGuard';

export default function CheckStatusPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="w-8 h-8 border-4 border-jecrc-red/30 border-t-jecrc-red rounded-full animate-spin" />
        </div>
      }>
        <StudentAuthGuard>
          <CheckStatusContent />
        </StudentAuthGuard>
      </Suspense>
    </ErrorBoundary>
  );
}