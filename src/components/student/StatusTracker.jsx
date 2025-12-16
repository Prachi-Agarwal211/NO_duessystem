'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import ProgressBar from './ProgressBar';
import DepartmentStatus from './DepartmentStatus';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ReapplyModal from './ReapplyModal';

export default function StatusTracker({ registrationNo }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showReapplyModal, setShowReapplyModal] = useState(false);

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Validate registration number
      if (!registrationNo || typeof registrationNo !== 'string') {
        throw new Error('Invalid registration number');
      }

      // OPTIMIZATION: Use optimized API endpoint instead of direct Supabase queries
      // This provides better performance, caching, and timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      // Add timestamp to prevent any caching
      const timestamp = Date.now();
      const response = await fetch(
        `/api/check-status?registration_no=${encodeURIComponent(registrationNo.trim().toUpperCase())}&t=${timestamp}`,
        {
          signal: controller.signal,
          cache: 'no-store', // Always get fresh data
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 404 || errorData.notFound) {
          throw new Error('No form found for this registration number');
        }
        
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Invalid response from server');
      }

      // Update state with optimized data
      console.log('📊 Fresh data received from API:', {
        formStatus: result.data.form.status,
        isManualEntry: result.data.form.is_manual_entry,
        departmentStatuses: result.data.statusData.map(d => ({
          name: d.display_name,
          status: d.status
        }))
      });
      setFormData(result.data.form);
      setStatusData(result.data.statusData);

    } catch (err) {
      console.error('Error fetching data:', err);

      // Provide more user-friendly error messages
      if (err.name === 'AbortError') {
        setError('Request timed out after 30 seconds. Please check your internet connection and try again.');
      } else if (err.message.includes('No form found')) {
        setError(err.message);
      } else if (err.message.includes('Failed to fetch')) {
        setError('Network error - unable to connect to server. Please check your internet connection.');
      } else {
        setError(`Failed to load status: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (registrationNo) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationNo]); // fetchData is stable, only re-run when registrationNo changes

  // Separate effect for real-time subscriptions after form data is loaded
  useEffect(() => {
    if (!formData?.id) return;

    let isSubscribed = false;
    let intervalId = null;

    // Set up real-time subscription with proper filtering
    const channel = supabase
      .channel(`form-${registrationNo}-${formData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'no_dues_status',
          filter: `form_id=eq.${formData.id}`
        },
        (payload) => {
          // Only refresh if it's for our form
          if (payload.new?.form_id === formData.id) {
            console.log('Real-time status update received:', payload);
            fetchData(true);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to status updates');
          isSubscribed = true;
          // Clear interval once subscription is active
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Subscription error - falling back to polling');
          isSubscribed = false;
          // Restart polling if subscription fails
          if (!intervalId) {
            intervalId = setInterval(() => {
              if (!refreshing) {
                fetchData(true);
              }
            }, 60000);
          }
        }
      });

    // Fallback polling - only if subscription not active after 5 seconds
    const fallbackTimeout = setTimeout(() => {
      if (!isSubscribed && !intervalId) {
        console.log('Subscription not active, starting fallback polling');
        intervalId = setInterval(() => {
          if (!refreshing) {
            fetchData(true);
          }
        }, 60000);
      }
    }, 5000);

    return () => {
      try {
        clearTimeout(fallbackTimeout);
        if (intervalId) {
          clearInterval(intervalId);
        }
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData?.id, registrationNo]); // Dependencies: formData.id and registrationNo for channel name

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-lg text-center transition-all duration-700 ease-smooth
        ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className={`p-6 rounded-lg text-center transition-all duration-700 ease-smooth
        ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-black/10'}`}>
        <p className={`transition-colors duration-700 ease-smooth
          ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          No form found for this registration number
        </p>
      </div>
    );
  }

  // ✅ Check if this is a manual entry (admin-only workflow)
  const isManualEntry = formData.is_manual_entry === true;
  
  const approvedCount = statusData.filter(s => s.status === 'approved').length;
  const rejectedCount = statusData.filter(s => s.status === 'rejected').length;
  const totalCount = statusData.length;
  
  // ✅ For manual entries, base status on form approval, not department count
  const allApproved = isManualEntry
    ? formData.status === 'approved'
    : approvedCount === totalCount;
    
  const hasRejection = isManualEntry
    ? formData.status === 'rejected'
    : rejectedCount > 0;
    
  const rejectedDepartments = statusData.filter(s => s.status === 'rejected');
  const canReapply = hasRejection && formData.status !== 'completed';

  // 🐛 DEBUG: Log reapply button visibility logic
  console.log('🔍 Reapply Button Debug:', {
    hasRejection,
    formStatus: formData.status,
    canReapply,
    rejectedCount,
    rejectedDepartments: rejectedDepartments.map(d => d.display_name),
    isManualEntry,
    allApproved
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="space-y-6"
    >
      {/* Header Card */}
      <div className={`p-6 rounded-xl backdrop-blur-md transition-all duration-700 ease-smooth
        ${isDark
          ? 'bg-white/[0.02] border border-white/10'
          : 'bg-white border border-black/10 shadow-sm'
        }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 transition-colors duration-700 ease-smooth
              ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Application Status
            </h3>
            <h2 className={`text-2xl font-serif mb-1 transition-colors duration-700 ease-smooth
              ${isDark ? 'text-white' : 'text-ink-black'}`}>
              {formData.student_name}
            </h2>
            <p className={`text-sm transition-colors duration-700 ease-smooth
              ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Registration No: <span className="font-mono font-bold">{formData.registration_no}</span>
            </p>
            <p className={`text-xs mt-1 transition-colors duration-700 ease-smooth
              ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Submitted: {new Date(formData.created_at).toLocaleDateString('en-IN', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className={`interactive flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300
              ${isDark
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                : 'bg-gray-100 hover:bg-gray-200 text-ink-black border border-black/10'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="mt-6">
          {isManualEntry ? (
            // ✅ Manual entry: Show simple admin status badge
            <div className="text-center py-4">
              <span className={`inline-flex items-center px-6 py-3 rounded-full text-base font-bold uppercase tracking-wide transition-all duration-700 ease-smooth ${
                formData.status === 'approved'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-2 border-green-500'
                  : formData.status === 'rejected'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-2 border-red-500'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-2 border-yellow-500'
              }`}>
                {formData.status === 'approved' ? '✅ Admin Approved' :
                 formData.status === 'rejected' ? '❌ Admin Rejected' :
                 '⏳ Pending Admin Review'}
              </span>
              <p className={`text-sm mt-3 transition-colors duration-700 ease-smooth ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {formData.status === 'approved'
                  ? 'Your offline certificate has been verified and approved'
                  : formData.status === 'rejected'
                  ? 'Your offline certificate submission was rejected'
                  : 'Your offline certificate is awaiting admin verification'}
              </p>
            </div>
          ) : (
            // ✅ Online form: Show department progress bar
            <ProgressBar current={approvedCount} total={totalCount} />
          )}
        </div>
      </div>

      {/* Rejection Alert */}
      {hasRejection && !allApproved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 rounded-xl backdrop-blur-md transition-all duration-700 ease-smooth border-2 ${
            isDark
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-4">
            <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-red-500 font-bold text-xl mb-2 flex items-center gap-2">
                Application Rejected by {rejectedCount} Department{rejectedCount > 1 ? 's' : ''}
              </h3>
              
              {/* 🔥 NEW: Show cascade context explanation */}
              {formData.rejection_context && formData.rejection_context.cascade_count > 0 && (
                <div className={`mb-4 p-3 rounded-lg transition-all duration-700 ease-smooth ${
                  isDark ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`text-sm font-medium transition-colors duration-700 ease-smooth ${
                    isDark ? 'text-yellow-400' : 'text-yellow-700'
                  }`}>
                    ⚠️ <strong>Cascade Rejection:</strong> {formData.rejection_context.primary_rejector} rejected your application,
                    which automatically rejected {formData.rejection_context.cascade_count} other pending department{formData.rejection_context.cascade_count > 1 ? 's' : ''}.
                  </p>
                  {formData.rejection_context.cascade_departments && formData.rejection_context.cascade_departments.length > 0 && (
                    <p className={`text-xs mt-2 transition-colors duration-700 ease-smooth ${
                      isDark ? 'text-yellow-300/70' : 'text-yellow-600'
                    }`}>
                      Auto-rejected: {formData.rejection_context.cascade_departments.join(', ')}
                    </p>
                  )}
                </div>
              )}
              
              <p className={`text-sm mb-4 transition-colors duration-700 ease-smooth ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Your application has been rejected. Please review the rejection reasons below and reapply with the necessary corrections.
              </p>

              {/* Rejected Departments List */}
              <div className="space-y-3 mb-4">
                {rejectedDepartments.map((dept, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg transition-all duration-700 ease-smooth ${
                      isDark ? 'bg-red-500/5 border border-red-500/20' : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-bold text-red-400">{dept.display_name}</p>
                      {dept.action_at && (
                        <p className={`text-xs transition-colors duration-700 ease-smooth ${
                          isDark ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          {new Date(dept.action_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                    <p className={`text-sm transition-colors duration-700 ease-smooth ${
                      isDark ? 'text-red-300' : 'text-red-600'
                    }`}>
                      <span className="font-medium">Reason: </span>
                      {dept.rejection_reason}
                    </p>
                  </div>
                ))}
              </div>

              {/* Current Reply Message if exists */}
              {formData.student_reply_message && formData.reapplication_count > 0 && (
                <div className={`p-4 rounded-lg mb-4 transition-all duration-700 ease-smooth ${
                  isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-medium text-blue-400">
                      Your Previous Response (Reapplication #{formData.reapplication_count}):
                    </p>
                  </div>
                  <p className={`text-sm italic transition-colors duration-700 ease-smooth ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    "{formData.student_reply_message}"
                  </p>
                </div>
              )}

              {/* Reapply Button */}
              {canReapply && (
                <button
                  onClick={() => setShowReapplyModal(true)}
                  className="w-full bg-jecrc-red hover:bg-red-700 text-white py-4 rounded-lg font-bold transition-all duration-300 shadow-lg shadow-jecrc-red/20 hover:shadow-jecrc-red/40 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reapply with Corrections
                </button>
              )}

              {!canReapply && formData.status === 'completed' && (
                <div className={`text-center text-sm transition-colors duration-700 ease-smooth ${
                  isDark ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Form is completed. Reapplication not allowed.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* All Approved Message */}
      {allApproved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 rounded-xl text-center backdrop-blur-md transition-all duration-700 ease-smooth
            ${isDark
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-green-50 border border-green-200'
            }`}
        >
          <h3 className="text-green-500 font-bold text-lg mb-2">
            ✅ All Departments Approved!
          </h3>
          <p className={`text-sm mb-4 transition-colors duration-700 ease-smooth
            ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Your certificate is ready for download
          </p>
          {formData.certificate_url && (
            <a
              href={formData.certificate_url}
              target="_blank"
              rel="noopener noreferrer"
              className="interactive inline-flex items-center gap-2 px-6 py-3 bg-jecrc-red hover:bg-red-700 text-white rounded-lg font-bold transition-all duration-300 shadow-lg shadow-jecrc-red/20 hover:shadow-jecrc-red/40"
            >
              <Download size={20} />
              Download Certificate
            </a>
          )}
        </motion.div>
      )}

      {/* Department Statuses - Only show for online forms */}
      {!isManualEntry && statusData.length > 0 && (
        <div className={`p-6 rounded-xl backdrop-blur-md transition-all duration-700 ease-smooth
          ${isDark
            ? 'bg-white/[0.02] border border-white/10'
            : 'bg-white border border-black/10 shadow-sm'
          }`}>
          <h3 className={`text-lg font-serif mb-4 transition-colors duration-700 ease-smooth
            ${isDark ? 'text-white' : 'text-ink-black'}`}>
            Department Clearances
          </h3>
          <div className="space-y-3">
            {statusData.map((item, index) => (
              <motion.div
                key={item.department_name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <DepartmentStatus
                  departmentName={item.display_name}
                  status={item.status}
                  actionAt={item.action_at}
                  rejectionReason={item.rejection_reason}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Entry Certificate View */}
      {isManualEntry && formData.manual_certificate_url && (
        <div className={`p-6 rounded-xl backdrop-blur-md transition-all duration-700 ease-smooth
          ${isDark
            ? 'bg-white/[0.02] border border-white/10'
            : 'bg-white border border-black/10 shadow-sm'
          }`}>
          <h3 className={`text-lg font-serif mb-4 transition-colors duration-700 ease-smooth
            ${isDark ? 'text-white' : 'text-ink-black'}`}>
            Submitted Certificate
          </h3>
          <a
            href={formData.manual_certificate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="interactive inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-300"
          >
            <Download size={20} />
            View Submitted Certificate
          </a>
        </div>
      )}

      {/* Auto-refresh Notice */}
      <p className={`text-xs text-center transition-colors duration-700 ease-smooth
        ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
        Real-time updates enabled • Auto-refresh fallback every 60 seconds
      </p>

      {/* Reapply Modal */}
      {showReapplyModal && (
        <ReapplyModal
          formData={formData}
          rejectedDepartments={rejectedDepartments}
          onClose={() => setShowReapplyModal(false)}
          onSuccess={(result) => {
            setShowReapplyModal(false);
            // Add delay to ensure database updates have fully propagated
            // Increased to 1500ms to handle Supabase replication lag
            setTimeout(() => {
              fetchData(true);
            }, 1500);
          }}
        />
      )}
    </motion.div>
  );
}