'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function StatusTracker({ formId, currentStatus, departments }) {
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [certificateUrl, setCertificateUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatusData = async () => {
      try {
        // Fetch all status records for this form
        const { data, error } = await supabase
          .from('no_dues_status')
          .select(`
            *,
            department:departments(display_name)
          `)
          .eq('form_id', formId);

        if (error) throw error;

        // Format the status data with department names
        const formattedData = departments.map(dept => {
          const statusRecord = data.find(s => s.department_name === dept.name);
          return {
            department: dept.display_name,
            status: statusRecord ? statusRecord.status : 'pending',
            action_at: statusRecord ? statusRecord.action_at : null,
            rejection_reason: statusRecord ? statusRecord.rejection_reason : null,
            ...statusRecord
          };
        });

        setStatusData(formattedData);

        // Check if certificate is available
        const { data: formData, error: formError } = await supabase
          .from('no_dues_forms')
          .select('certificate_url, final_certificate_generated')
          .eq('id', formId)
          .single();

        if (formData && formData.final_certificate_generated && formData.certificate_url) {
          setCertificateUrl(formData.certificate_url);
        }
      } catch (err) {
        console.error('Error fetching status data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (formId && departments.length > 0) {
      fetchStatusData();

      // Set up real-time subscription to update status
      const channel = supabase
        .channel('status-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'no_dues_status',
            filter: `form_id=eq.${formId}`,
          },
          (payload) => {
            setStatusData(prev => prev.map(item => 
              item.department_name === payload.new.department_name 
                ? { ...item, ...payload.new, status: payload.new.status } 
                : item
            ));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [formId, departments]);

  if (loading) {
    return <div className="flex justify-center"><LoadingSpinner /></div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
        Error loading status: {error}
      </div>
    );
  }

  const allApproved = statusData.every(item => item.status === 'approved');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Application Status</h2>
          <div className="mt-2">
            <StatusBadge status={currentStatus} />
          </div>
        </div>
        
        {certificateUrl && (
          <a 
            href={certificateUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
          >
            Download Certificate
          </a>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {statusData.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.department}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {item.action_at ? new Date(item.action_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  {item.status === 'rejected' && item.rejection_reason ? item.rejection_reason : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {allApproved && !certificateUrl && (
        <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-200">
          All departments have approved your request! Your certificate will be generated shortly.
        </div>
      )}
    </div>
  );
}