'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useStaffDashboard } from '@/hooks/useStaffDashboard';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import DataTable from '@/components/ui/DataTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import Logo from '@/components/ui/Logo';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Use the new real-time hook
  const {
    user,
    loading,
    refreshing,
    requests,
    error,
    lastUpdate,
    fetchDashboardData,
    refreshData
  } = useStaffDashboard();

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data when debounced search term changes
  useEffect(() => {
    if (user) {
      fetchDashboardData(debouncedSearchTerm);
    }
  }, [user, debouncedSearchTerm, fetchDashboardData]);

  // Listen for new submission events and show toast
  useEffect(() => {
    const handleNewSubmission = (event) => {
      const { registrationNo, studentName } = event.detail;
      toast.success('New Application Received!', {
        description: `${studentName} (${registrationNo})`,
        duration: 5000,
      });
    };

    window.addEventListener('new-staff-submission', handleNewSubmission);
    return () => window.removeEventListener('new-staff-submission', handleNewSubmission);
  }, []);

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
            {/* Centered Logo - University Crest */}
            <div className="w-full flex justify-center mb-8 animate-fade-in">
              <Logo size="small" priority={true} />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
              <div className="flex-1">
                <h1 className={`text-2xl sm:text-3xl font-bold transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                  }`}>
                  {user?.role === 'admin'
                    ? 'Admin Dashboard'
                    : `${user?.department_name || 'Department'} Dashboard`}
                </h1>
                <div className={`text-sm mt-2 transition-colors duration-700 ${isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                  Welcome, {user?.full_name}
                </div>
              </div>

              {/* Real-time indicator and refresh button */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-green-400' : 'bg-green-500'} animate-pulse`} />
                  <span className={`transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Live • Updated {lastUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <button
                  onClick={refreshData}
                  disabled={refreshing}
                  className={`interactive flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300
                    ${isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                      : 'bg-gray-100 hover:bg-gray-200 text-ink-black border border-black/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
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