'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatusBadge from '@/components/ui/StatusBadge';

export default function AdminRequestDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRequestDetail();
  }, [id]);

  const fetchRequestDetail = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Verify user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        router.push('/unauthorized');
        return;
      }

      const { data, error } = await supabase
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status (
            id,
            department_name,
            status,
            action_at,
            action_by_user_id,
            rejection_reason,
            profiles (
              full_name
            )
          ),
          profiles!no_dues_forms_user_id_fkey (
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Calculate response times
      const requestWithMetrics = {
        ...data,
        no_dues_status: data.no_dues_status.map(status => ({
          ...status,
          response_time: calculateResponseTime(data.created_at, status.created_at, status.action_at)
        }))
      };

      setRequest(requestWithMetrics);
    } catch (err) {
      console.error('Error fetching request detail:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateResponseTime = (formCreated, statusCreated, actionAt) => {
    if (!actionAt) return 'Pending';
    
    const created = new Date(statusCreated);
    const action = new Date(actionAt);
    const diff = action - created;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-300 mb-4">Error Loading Request</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-gray-300 mb-4">Request Not Found</h2>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg mb-6"
          >
            ← Back to Dashboard
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Request Details</h1>
              <p className="text-gray-400">ID: {request.id}</p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={request.status} />
            </div>
          </div>
        </div>

        {/* Student Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Student Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-sm">Name:</span>
                <p className="font-medium">{request.student_name}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Registration No:</span>
                <p className="font-medium">{request.registration_no}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Email:</span>
                <p className="font-medium">{request.profiles?.email || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Course:</span>
                <p className="font-medium">{request.course || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Branch:</span>
                <p className="font-medium">{request.branch || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">School:</span>
                <p className="font-medium">{request.school}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Session:</span>
                <p className="font-medium">{request.session_from} - {request.session_to}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Parent Name:</span>
                <p className="font-medium">{request.parent_name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Contact:</span>
                <p className="font-medium">{request.contact_no || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Request Details</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-sm">Status:</span>
                <div className="mt-1">
                  <StatusBadge status={request.status} />
                </div>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Submitted:</span>
                <p className="font-medium">{new Date(request.created_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Last Updated:</span>
                <p className="font-medium">{new Date(request.updated_at).toLocaleString()}</p>
              </div>
              {request.alumni_screenshot_url && (
                <div>
                  <span className="text-gray-400 text-sm">Alumni Screenshot:</span>
                  <div className="mt-2">
                    <img 
                      src={request.alumni_screenshot_url} 
                      alt="Alumni verification" 
                      className="max-w-xs h-auto rounded-lg border border-gray-600"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Department Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Department Status</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Response Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Action By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Reason for Rejection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {request.no_dues_status.map((status, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{status.department_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={status.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{status.response_time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{status.profiles?.full_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {status.status === 'rejected' && status.rejection_reason ? status.rejection_reason : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {status.action_at ? new Date(status.action_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            Print Report
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}