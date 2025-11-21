'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import DataTable from '@/components/ui/DataTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';

export default function StaffDashboard() {
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push('/staff/login');
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
      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  // Separate effect to fetch dashboard data when search term changes
  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Build query params with search term
        const params = new URLSearchParams({
          userId: session.user.id,
          page: 1,
          limit: 50
        });

        // Add search term if present
        if (debouncedSearchTerm.trim()) {
          params.append('search', debouncedSearchTerm.trim());
        }

        const response = await fetch(`/api/staff/dashboard?${params}`);
        const result = await response.json();

        if (result.success) {
          // For department staff, extract form data from status records
          const applications = result.data.applications || [];
          console.log('📊 Dashboard - Received applications:', applications.length);

          // Filter out applications with null forms (orphaned records)
          const validApplications = applications.filter(item => {
            if (!item.no_dues_forms) {
              console.warn('⚠️ Orphaned status record found, skipping:', item.form_id);
              return false;
            }
            return true;
          });

          console.log('✅ Valid applications after filtering:', validApplications.length);

          const formattedRequests = validApplications.map(item => item.no_dues_forms);
          console.log('📋 First request:', formattedRequests[0]);

          setRequests(formattedRequests);
        } else {
          console.error('API Error:', result.error);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [user, debouncedSearchTerm]);

  const handleRowClick = (row) => {
    router.push(`/staff/student/${row.id}`);
  };

  // Remove client-side filtering - API now handles search
  const tableHeaders = ['Student Name', 'Registration No', 'Status', 'Date'];

  const tableData = requests.map(request => ({
    'student_name': request.student_name,
    'registration_no': request.registration_no,
    'status': request.status,
    'date': new Date(request.created_at).toLocaleDateString(),
    'id': request.id
  }));

  if (loading) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <GlassCard>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
              <h1 className={`text-2xl sm:text-3xl font-bold transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                }`}>
                {user?.role === 'admin'
                  ? 'Admin Dashboard'
                  : `${user?.department_name || 'Department'} Dashboard`}
              </h1>
              <div className={`text-sm transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
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
              <h2 className={`text-lg sm:text-xl font-semibold mb-4 transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                }`}>
                {user?.role === 'admin'
                  ? 'All Pending Requests'
                  : 'Pending Requests for Your Department'}
              </h2>

              {requests.length > 0 ? (
                <DataTable
                  headers={tableHeaders}
                  data={tableData}
                  onRowClick={handleRowClick}
                />
              ) : (
                <div className={`text-center py-8 transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  {debouncedSearchTerm ? 'No matching requests found' : 'No pending requests'}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </PageWrapper>
  );
}