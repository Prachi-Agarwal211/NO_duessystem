'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import GlassCard from '@/components/ui/GlassCard';
import DataTable from '@/components/ui/DataTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';

export default function StaffDashboard() {
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('full_name, role, department_name')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || (userData.role !== 'department' && userData.role !== 'admin')) {
        router.push('/unauthorized');
        return;
      }

      setUser(userData);

      // Fetch dashboard data using the API
      try {
        const response = await fetch(`/api/staff/dashboard?userId=${session.user.id}`);
        const result = await response.json();

        if (result.success) {
          // For department staff, extract form data from status records
          const applications = result.data.applications || [];
          setRequests(applications.map(item => item.no_dues_forms));
        } else {
          console.error('API Error:', result.error);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }

      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  const handleRowClick = (row) => {
    router.push(`/staff/student/${row.id}`);
  };

  const filteredRequests = requests.filter(request =>
    request.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.registration_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tableHeaders = ['Student Name', 'Registration No', 'Status', 'Date'];

  const tableData = filteredRequests.map(request => ({
    'student_name': request.student_name,
    'registration_no': request.registration_no,
    'status': request.status,
    'date': new Date(request.created_at).toLocaleDateString()
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="min-h-screen py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <GlassCard>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h1 className="text-2xl font-bold">
                {user?.role === 'admin'
                  ? 'Admin Dashboard'
                  : `${user?.department_name || 'Department'} Dashboard`}
              </h1>
              <div className="text-sm text-gray-300">
                Welcome, {user?.full_name}
              </div>
            </div>

            <div className="mb-6">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by name or registration number..."
              />
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-4">
                {user?.role === 'admin'
                  ? 'All Pending Requests'
                  : 'Pending Requests for Your Department'}
              </h2>

              {filteredRequests.length > 0 ? (
                <DataTable
                  headers={tableHeaders}
                  data={tableData}
                  onRowClick={handleRowClick}
                />
              ) : (
                <div className="text-center py-8 text-gray-400">
                  {searchTerm ? 'No matching requests found' : 'No pending requests'}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}