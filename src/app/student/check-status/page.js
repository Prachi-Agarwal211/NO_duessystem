'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, AlertCircle, FileText, ArrowLeft } from 'lucide-react';
import PageWrapper from '@/components/landing/PageWrapper';
import FormInput from '@/components/student/FormInput';
import StatusTracker from '@/components/student/StatusTracker';
import Logo from '@/components/ui/Logo';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

  // ✅ Define performSearch with useCallback to stabilize dependency
  const performSearch = async (regNo) => {
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
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const queryPromise = supabase
        .from('no_dues_forms')
        .select('*')
        .eq('registration_no', searchRegNo.toUpperCase())
        .single();

      const { data, error: supabaseError } = await Promise.race([queryPromise, timeoutPromise]);

      if (supabaseError) {
        if (supabaseError.code === 'PGRST116') {
          setNotFound(true);
        } else if (supabaseError.message === 'Request timeout') {
          throw new Error('Request timed out. Please check your connection and try again.');
        } else {
          throw supabaseError;
        }
      } else {
        if (!data) {
          setNotFound(true);
          return;
        }

        setFormData(data);
        // Update URL with registration number for persistence on refresh
        router.replace(`/student/check-status?reg=${searchRegNo.toUpperCase()}`, { scroll: false });
      }
    } catch (err) {
      console.error('Error fetching form:', err);

      // User-friendly error messages
      let errorMessage = 'Failed to fetch status. Please try again.';

      if (err.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.code === 'PGRST301') {
        errorMessage = 'Database connection error. Please try again later.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSearch = async (e) => {
    e.preventDefault();
    await performSearch();
  };

  const handleReset = () => {
    setRegistrationNumber('');
    setFormData(null);
    setNotFound(false);
    setError('');
    router.replace('/student/check-status', { scroll: false });
  };

  return (
    <PageWrapper>
      <div className="min-h-screen pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => router.push('/')}
            className={`interactive mb-8 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-700 ease-smooth backdrop-blur-md
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
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Check No Dues Form Status
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Enter your registration number to view the current status of your No Dues application
            </p>
          </motion.div>

          {/* Search Form */}
          {!formData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="glass-card p-8 rounded-2xl border border-white/20 dark:border-gray-700/50 mb-8"
            >
              <form onSubmit={handleSearch} className="space-y-6">
                <FormInput
                  label="Registration Number"
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., 21EJECS001"
                  error={error}
                  disabled={loading}
                  icon={<Search className="w-5 h-5" />}
                />

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-gradient-to-r from-jecrc-red to-jecrc-red/80 text-white rounded-xl font-manrope font-semibold text-lg hover:shadow-xl hover:shadow-jecrc-red/25 transition-all duration-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
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
              <h3 className="font-cinzel text-2xl font-bold text-gray-900 dark:text-white mb-3">
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

          {/* Status Tracker */}
          {formData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              {/* Student Info Card */}
              <div className="glass-card p-6 rounded-2xl border border-white/20 dark:border-gray-700/50 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Registration Number</p>
                    <p className="font-mono text-2xl font-bold text-jecrc-red">{formData.registration_no}</p>
                  </div>
                  <motion.button
                    onClick={handleReset}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-manrope font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-700"
                  >
                    Check Another
                  </motion.button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Student Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formData.student_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Contact</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formData.contact_no}</p>
                  </div>
                  {formData.school && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">School</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formData.school}</p>
                    </div>
                  )}
                  {formData.course && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Course</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formData.course}</p>
                    </div>
                  )}
                  {formData.branch && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Branch</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formData.branch}</p>
                    </div>
                  )}
                  {formData.personal_email && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Personal Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formData.personal_email}</p>
                    </div>
                  )}
                  {formData.college_email && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">College Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formData.college_email}</p>
                    </div>
                  )}
                  {formData.admission_year && formData.passing_year && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Academic Period</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formData.admission_year} (Admission) - {formData.passing_year} (Passing)
                      </p>
                    </div>
                  )}
                </div>
              </div>

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

export default function CheckStatusPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <PageWrapper>
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-jecrc-red/30 border-t-jecrc-red rounded-full animate-spin" />
          </div>
        </PageWrapper>
      }>
        <PageWrapper>
          <CheckStatusContent />
        </PageWrapper>
      </Suspense>
    </ErrorBoundary>
  );
}