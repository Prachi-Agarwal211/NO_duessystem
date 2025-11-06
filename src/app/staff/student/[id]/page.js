'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import BackgroundGradientAnimation from '@/components/ui/background-gradient-animation';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function StudentDetailView() {
  const { id } = useParams();
  const router = useRouter();
  const [studentData, setStudentData] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user info
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('full_name, role, department_name')
          .eq('id', session.user.id)
          .single();

        if (userError || !userData || (userData.role !== 'department' && userData.role !== 'registrar')) {
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

    if (id) {
      fetchData();
    }
  }, [id, router]);

  const handleApprove = async () => {
    if (!user || !user.id || !user.department_name) {
      setError('User information not loaded. Please refresh the page.');
      return;
    }
    
    setApproving(true);
    setError('');

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

      if (result.success) {
        // Refresh status data
        const statusResponse = await fetch(`/api/staff/student/${id}?userId=${user.id}`);
        const statusResult = await statusResponse.json();

        if (statusResult.success) {
          setStudentData(statusResult.data.form);
          setStatusData(statusResult.data.departmentStatuses);
          
          // Navigate back to dashboard
          router.push('/staff/dashboard');
        }
      } else {
        throw new Error(result.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Approval error:', error);
      setError(error.message);
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

      if (result.success) {
        // Refresh status data
        const statusResponse = await fetch(`/api/staff/student/${id}?userId=${user.id}`);
        const statusResult = await statusResponse.json();

        if (statusResult.success) {
          setStudentData(statusResult.data.form);
          setStatusData(statusResult.data.departmentStatuses);
          
          // Navigate back to dashboard
          router.push('/staff/dashboard');
        }
      } else {
        throw new Error(result.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      setError(error.message);
    } finally {
      setRejecting(false);
      setShowRejectModal(false);
      setRejectionReason('');
    }
  };

  if (loading) {
    return (
      <BackgroundGradientAnimation>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </BackgroundGradientAnimation>
    );
  }

  if (error) {
    return (
      <BackgroundGradientAnimation>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard className="max-w-2xl w-full p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Error Loading Student Data</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <button 
              onClick={() => router.back()} 
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </GlassCard>
        </div>
      </BackgroundGradientAnimation>
    );
  }

  if (!studentData) {
    return (
      <BackgroundGradientAnimation>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard className="max-w-2xl w-full p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Student Not Found</h2>
            <button 
              onClick={() => router.back()} 
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </GlassCard>
        </div>
      </BackgroundGradientAnimation>
    );
  }

  const userDepartmentStatus = statusData.find(s => s.department_name === user?.department_name);
  const canApproveOrReject = user?.role === 'department' && userDepartmentStatus?.status === 'pending';

  return (
    <BackgroundGradientAnimation>
      <div className="min-h-screen py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <GlassCard>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h1 className="text-2xl font-bold">Student Details</h1>
                <div className="mt-2">
                  <StatusBadge status={studentData.status} />
                </div>
              </div>
              
              <div className="text-sm text-gray-300">
                {user?.full_name} ({user?.role})
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h2 className="text-lg font-semibold mb-4">Student Information</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Name:</span> {studentData.student_name}
                  </div>
                  <div>
                    <span className="text-gray-400">Registration No:</span> {studentData.registration_no}
                  </div>
                  <div>
                    <span className="text-gray-400">Session:</span> {studentData.session_from} - {studentData.session_to}
                  </div>
                  <div>
                    <span className="text-gray-400">Parent Name:</span> {studentData.parent_name}
                  </div>
                  <div>
                    <span className="text-gray-400">School:</span> {studentData.school}
                  </div>
                  <div>
                    <span className="text-gray-400">Course:</span> {studentData.course}
                  </div>
                  <div>
                    <span className="text-gray-400">Branch:</span> {studentData.branch}
                  </div>
                  <div>
                    <span className="text-gray-400">Contact:</span> {studentData.contact_no}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Verification</h2>
                {studentData.alumni_screenshot_url ? (
                  <div>
                    <div className="text-gray-400 mb-2">Alumni Verification Screenshot:</div>
                    <img 
                      src={studentData.alumni_screenshot_url} 
                      alt="Alumni verification" 
                      className="max-w-xs h-auto rounded-lg border border-white/20"
                    />
                  </div>
                ) : (
                  <div className="text-gray-400">No alumni verification screenshot provided</div>
                )}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Department Status</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Updated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Action By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {statusData.map((status, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{status.display_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={status.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {status.action_at ? new Date(status.action_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {status.action_by ? status.action_by : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {status.status === 'rejected' && status.rejection_reason ? status.rejection_reason : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {canApproveOrReject && (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {approving ? 'Approving...' : 'Approve Request'}
                </button>
                
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={rejecting}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {rejecting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                <GlassCard className="w-full max-w-md p-6">
                  <h3 className="text-lg font-semibold mb-4">Reject Request</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Rejection Reason</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      rows="4"
                      placeholder="Enter reason for rejection..."
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowRejectModal(false);
                        setRejectionReason('');
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={!rejectionReason.trim() || rejecting}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                    >
                      {rejecting ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                  </div>
                </GlassCard>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </BackgroundGradientAnimation>
  );
}