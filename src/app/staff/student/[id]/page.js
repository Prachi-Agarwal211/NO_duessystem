'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function StudentDetailView() {
  const { id } = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [studentData, setStudentData] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [error, setError] = useState('');

  // Fetch data function
  const fetchData = async () => {
    try {
      // Get user info
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/staff/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, role, department_name')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || (userData.role !== 'department' && userData.role !== 'admin')) {
        router.push('/unauthorized');
        return;
      }

      setUser(userData);

      // Get student data using the API
      const response = await fetch(`/api/staff/student/${id}?userId=${session.user.id}`);
      const result = await response.json();

      if (result.success) {
        setStudentData(result.data.form);
        setStatusData(result.data.departmentStatuses);
      } else {
        throw new Error(result.error || 'Failed to fetch student data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, router]);

  // Real-time subscription for status updates
  useEffect(() => {
    if (!id || !studentData?.id) return;

    let isSubscribed = false;
    let pollingInterval = null;

    // Set up real-time subscription for status changes
    const channel = supabase
      .channel(`student-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'no_dues_status',
          filter: `form_id=eq.${studentData.id}`
        },
        (payload) => {
          console.log('🔄 Status updated in real-time:', payload.new?.department_name);
          // Refresh data when any department status changes
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'no_dues_forms',
          filter: `id=eq.${studentData.id}`
        },
        (payload) => {
          console.log('📝 Form updated in real-time');
          // Refresh data when form is updated
          fetchData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Student detail subscribed to real-time updates');
          isSubscribed = true;
          // Clear polling if subscription is active
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error - falling back to polling');
          isSubscribed = false;
          // Start polling as fallback
          if (!pollingInterval) {
            pollingInterval = setInterval(() => {
              fetchData();
            }, 30000); // Poll every 30 seconds
          }
        }
      });

    // Fallback polling - only if subscription not active after 5 seconds
    const fallbackTimeout = setTimeout(() => {
      if (!isSubscribed && !pollingInterval) {
        console.log('⏰ Subscription not active, starting fallback polling');
        pollingInterval = setInterval(() => {
          fetchData();
        }, 30000); // Poll every 30 seconds
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimeout);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      supabase.removeChannel(channel);
    };
  }, [id, studentData?.id]);

  const handleApproveClick = () => {
    setShowApproveModal(true);
    // Scroll modal into view after it appears
    setTimeout(() => {
      document.getElementById('approve-modal')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 150);
  };

  const handleApprove = async () => {
    if (!user || !user.id || !user.department_name) {
      setError('User information not loaded. Please refresh the page.');
      return;
    }

    setApproving(true);
    setError('');
    setShowApproveModal(false);

    // OPTIMISTIC UI: Show success immediately for instant feedback
    toast.success('✅ Request approved! Updating...', {
      duration: 2000,
      position: 'top-center',
      style: {
        background: '#10B981',
        color: '#fff',
        fontWeight: '600',
      },
    });

    // Navigate immediately for perceived <100ms response
    router.push('/staff/dashboard');

    // Send request in background (will complete after navigation)
    try {
      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: id,
          departmentName: user.department_name,
          action: 'approve',
          userId: user.id
        })
      });

      const result = await response.json();

      if (!result.success) {
        // Only show error if request failed (user already navigated away)
        console.error('❌ Approval failed (background):', result.error);
        toast.error('Failed to approve request. Please check dashboard.', {
          duration: 4000,
        });
      } else {
        console.log('✅ Approval successful (background) - real-time will update dashboard');
      }
    } catch (error) {
      console.error('❌ Approval error (background):', error);
      toast.error('Network error during approval. Please check dashboard.', {
        duration: 4000,
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!user || !user.id || !user.department_name) {
      setError('User information not loaded. Please refresh the page.');
      return;
    }

    if (!rejectionReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }

    setRejecting(true);
    setError('');
    setShowRejectModal(false);

    // OPTIMISTIC UI: Show success immediately for instant feedback
    toast.error('🚫 Request rejected! Updating...', {
      duration: 2000,
      position: 'top-center',
      style: {
        background: '#EF4444',
        color: '#fff',
        fontWeight: '600',
      },
    });

    // Navigate immediately for perceived <100ms response
    router.push('/staff/dashboard');

    // Send request in background (will complete after navigation)
    try {
      const response = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: id,
          departmentName: user.department_name,
          action: 'reject',
          reason: rejectionReason,
          userId: user.id
        })
      });

      const result = await response.json();

      if (!result.success) {
        // Only show error if request failed (user already navigated away)
        console.error('❌ Rejection failed (background):', result.error);
        toast.error('Failed to reject request. Please check dashboard.', {
          duration: 4000,
        });
      } else {
        console.log('✅ Rejection successful (background) - real-time will update dashboard');
      }
    } catch (error) {
      console.error('❌ Rejection error (background):', error);
      toast.error('Network error during rejection. Please check dashboard.', {
        duration: 4000,
      });
    } finally {
      setRejecting(false);
      setRejectionReason('');
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard className="max-w-2xl w-full text-center">
            <h2 className={`text-xl font-bold mb-4 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
              }`}>
              Error Loading Student Data
            </h2>
            <p className="text-red-400 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-jecrc-red hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-300 min-h-[44px]"
            >
              Go Back
            </button>
          </GlassCard>
        </div>
      </PageWrapper>
    );
  }

  if (!studentData) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard className="max-w-2xl w-full text-center">
            <h2 className={`text-xl font-bold mb-4 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
              }`}>
              Student Not Found
            </h2>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-jecrc-red hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-300 min-h-[44px]"
            >
              Go Back
            </button>
          </GlassCard>
        </div>
      </PageWrapper>
    );
  }

  const userDepartmentStatus = statusData.find(s => s.department_name === user?.department_name);
  const canApproveOrReject = user?.role === 'department' && userDepartmentStatus?.status === 'pending';

  return (
    <PageWrapper>
      <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <GlassCard>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                  }`}>
                  Student Details
                </h1>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <StatusBadge status={studentData.status} />
                  {studentData.reapplication_count > 0 && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      🔄 Reapplication #{studentData.reapplication_count}
                    </span>
                  )}
                </div>
              </div>

              <div className={`text-sm transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                {user?.full_name} ({user?.role})
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                {error}
              </div>
            )}

            {/* Reapplication Info Banner */}
            {studentData.student_reply_message && studentData.reapplication_count > 0 && (
              <div className={`mb-6 p-4 rounded-lg border transition-colors duration-700 ${
                isDark
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 text-lg">💬</span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium mb-2 transition-colors duration-700 ${
                      isDark ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      Student's Reapplication Response (Reapplication #{studentData.reapplication_count}):
                    </p>
                    <p className={`text-sm italic transition-colors duration-700 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      "{studentData.student_reply_message}"
                    </p>
                    {studentData.last_reapplied_at && (
                      <p className={`text-xs mt-2 transition-colors duration-700 ${
                        isDark ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        Reapplied on: {new Date(studentData.last_reapplied_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div>
                <h2 className={`text-lg font-semibold mb-4 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                  }`}>
                  Student Information
                </h2>
                <div className="space-y-3">
                  <div className={`transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Name:</span> {studentData.student_name}
                  </div>
                  <div className={`transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Registration No:</span> {studentData.registration_no}
                  </div>
                  <div className={`transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Academic Period:</span> {studentData.admission_year} (Admission) - {studentData.passing_year} (Passing)
                  </div>
                  <div className={`transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Parent Name:</span> {studentData.parent_name}
                  </div>
                  <div className={`transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>School:</span> {studentData.school}
                  </div>
                  <div className={`transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Course:</span> {studentData.course}
                  </div>
                  <div className={`transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Branch:</span> {studentData.branch}
                  </div>
                  <div className={`transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Contact:</span> {studentData.contact_no}
                  </div>
                </div>
              </div>

              <div>
                <h2 className={`text-lg font-semibold mb-4 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                  }`}>
                  Verification
                </h2>
                {studentData.alumni_screenshot_url ? (
                  <div>
                    <div className={`mb-2 transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                      Alumni Verification Screenshot:
                    </div>
                    <img
                      src={studentData.alumni_screenshot_url}
                      alt="Alumni verification"
                      className={`max-w-xs h-auto rounded-lg border transition-colors duration-700 ${isDark ? 'border-white/20' : 'border-black/10'
                        }`}
                    />
                  </div>
                ) : (
                  <div className={`transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    No alumni verification screenshot provided
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <h2 className={`text-lg font-semibold mb-4 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                }`}>
                Department Status
              </h2>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full">
                  <thead>
                    <tr className={`transition-colors duration-700 ${isDark ? 'border-b border-gray-700' : 'border-b border-gray-200'
                      }`}>
                      <th className={`px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-700 ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'
                        }`}>
                        Department
                      </th>
                      <th className={`px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-700 ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'
                        }`}>
                        Status
                      </th>
                      <th className={`px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-700 ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'
                        }`}>
                        Updated
                      </th>
                      <th className={`px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-700 ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'
                        }`}>
                        Action By
                      </th>
                      <th className={`px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-700 ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'
                        }`}>
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`transition-colors duration-700 ${isDark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'
                    }`}>
                    {statusData.map((status, index) => (
                      <tr key={index} className={`transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-900'
                        }`}>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">{status.display_name}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={status.status} />
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                          {status.action_at ? new Date(status.action_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                          {status.action_by ? status.action_by : '-'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm">
                          {status.status === 'rejected' && status.rejection_reason ? (
                            <div>
                              <p className="text-red-400">{status.rejection_reason}</p>
                              {studentData.reapplication_count > 0 && (
                                <p className="text-xs text-orange-400 mt-1">
                                  ⚠️ Student has reapplied - please review updates
                                </p>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {canApproveOrReject && (
              <div id="action-buttons" className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={handleApproveClick}
                  disabled={approving}
                  className="interactive px-6 py-3 min-h-[44px] bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {approving ? 'Approving...' : 'Approve Request'}
                </button>

                <button
                  onClick={() => {
                    setShowRejectModal(true);
                    // Scroll modal into view after it appears
                    setTimeout(() => {
                      document.getElementById('reject-modal')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                      });
                    }, 150);
                  }}
                  disabled={rejecting}
                  className="interactive px-6 py-3 min-h-[44px] bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-white transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rejecting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            )}

            {/* Approve Confirmation Modal */}
            {showApproveModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
                <div id="approve-modal" className="w-full max-w-md my-8 animate-scale-in">
                  <GlassCard>
                    <h3 className={`text-lg font-semibold mb-4 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                      }`}>
                      Confirm Approval
                    </h3>

                    <p className={`mb-6 transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      Are you sure you want to approve this no dues request for <span className="font-bold">{studentData?.student_name}</span>?
                    </p>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                      <button
                        onClick={() => setShowApproveModal(false)}
                        disabled={approving}
                        className={`interactive px-6 py-3 min-h-[44px] rounded-lg font-medium transition-all duration-300 active:scale-95 ${isDark
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-ink-black'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={approving}
                        className="interactive px-6 py-3 min-h-[44px] bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {approving ? 'Approving...' : 'Confirm Approve'}
                      </button>
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
                <div id="reject-modal" className="w-full max-w-md my-8 animate-scale-in">
                  <GlassCard>
                    <h3 className={`text-lg font-semibold mb-4 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                      }`}>
                      Reject Request
                    </h3>

                    <div className="mb-4">
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Rejection Reason
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-jecrc-red transition-all duration-300 ${isDark
                          ? 'bg-white/10 border border-white/20 text-white placeholder-gray-500'
                          : 'bg-white border border-black/20 text-ink-black placeholder-gray-400'
                          }`}
                        rows="4"
                        placeholder="Enter reason for rejection..."
                        required
                      />
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowRejectModal(false);
                          setRejectionReason('');
                        }}
                        className={`interactive px-6 py-3 min-h-[44px] rounded-lg font-medium transition-all duration-300 active:scale-95 ${isDark
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-ink-black'
                          }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={!rejectionReason.trim() || rejecting}
                        className="interactive px-6 py-3 min-h-[44px] bg-red-600 hover:bg-red-700 rounded-lg font-medium text-white transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rejecting ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </PageWrapper>
  );
}