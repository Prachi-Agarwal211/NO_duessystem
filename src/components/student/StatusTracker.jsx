'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import ProgressBar from './ProgressBar';
import DepartmentStatus from './DepartmentStatus';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function StatusTracker({ registrationNo }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Validate registration number
      if (!registrationNo || typeof registrationNo !== 'string') {
        throw new Error('Invalid registration number');
      }

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      // Fetch form with timeout
      const formPromise = supabase
        .from('no_dues_forms')
        .select('*')
        .eq('registration_no', registrationNo.trim())
        .single();

      const { data: form, error: formError } = await Promise.race([formPromise, timeoutPromise]);

      if (formError) {
        if (formError.code === 'PGRST116') {
          throw new Error('No form found for this registration number');
        }
        throw formError;
      }

      if (!form) throw new Error('Form not found');

      setFormData(form);

      // Fetch departments and statuses in parallel with timeout
      const [deptPromise, statusPromise] = [
        supabase.from('departments').select('*').order('display_order'),
        supabase.from('no_dues_status').select('*').eq('form_id', form.id)
      ];

      const [{ data: departments, error: deptError }, { data: statuses, error: statusError }] =
        await Promise.all([deptPromise, statusPromise].map(p => Promise.race([p, timeoutPromise])));

      if (deptError) throw deptError;
      if (statusError) throw statusError;

      // Merge department data with status data
      const mergedData = departments.map(dept => {
        const status = statuses.find(s => s.department_name === dept.name);
        return {
          department_name: dept.name,
          display_name: dept.display_name,
          status: status?.status || 'pending',
          action_at: status?.action_at || null,
          rejection_reason: status?.rejection_reason || null,
          action_by_user_id: status?.action_by_user_id || null,
        };
      });

      setStatusData(mergedData);

    } catch (err) {
      console.error('Error fetching data:', err);

      // Provide more user-friendly error messages
      if (err.message === 'Request timeout') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err.message.includes('No form found')) {
        setError(err.message);
      } else {
        setError(`Failed to load status: ${err.message}`);
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

  const approvedCount = statusData.filter(s => s.status === 'approved').length;
  const totalCount = statusData.length;
  const allApproved = approvedCount === totalCount;

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
          <ProgressBar current={approvedCount} total={totalCount} />
        </div>
      </div>

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

      {/* Department Statuses */}
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

      {/* Auto-refresh Notice */}
      <p className={`text-xs text-center transition-colors duration-700 ease-smooth
        ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
        Real-time updates enabled • Auto-refresh fallback every 60 seconds
      </p>
    </motion.div>
  );
}