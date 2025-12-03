'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function useStaffDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Store current search term for refresh
  const currentSearchRef = useRef('');

  // Fetch user data
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
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
      setUserId(session.user.id);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchDashboardData = useCallback(async (searchTerm = '', isRefresh = false) => {
    // Store search term for real-time refresh
    currentSearchRef.current = searchTerm;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        throw new Error('Session expired. Please login again.');
      }

      // Build query params with search term
      const params = new URLSearchParams({
        userId: session.user.id,
        page: 1,
        limit: 50
      });

      // Add search term if present
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await fetch(`/api/staff/dashboard?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      if (result.success) {
        // For department staff, extract form data from status records
        const applications = result.data.applications || [];

        // Filter out applications with null forms (orphaned records)
        const validApplications = applications.filter(item => {
          if (!item.no_dues_forms) {
            console.warn('⚠️ Orphaned status record found, skipping:', item.form_id);
            return false;
          }
          return true;
        });

        const formattedRequests = validApplications.map(item => item.no_dues_forms);
        setRequests(formattedRequests);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Manual refresh function
  const refreshData = useCallback(() => {
    fetchDashboardData(currentSearchRef.current, true);
  }, [fetchDashboardData]);

  // ==================== REAL-TIME SUBSCRIPTION ====================
  // Subscribe to new form submissions and status updates for instant dashboard updates
  useEffect(() => {
    if (!userId || !user?.department_name) return;

    let isSubscribed = false;
    let pollingInterval = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // Set up real-time subscription for new form submissions and status changes
    const channel = supabase
      .channel('staff-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'no_dues_forms'
        },
        (payload) => {
          console.log('🔔 New form submission detected:', payload.new?.registration_no);
          // Show notification for new submission
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('new-staff-submission', {
              detail: {
                registrationNo: payload.new?.registration_no,
                studentName: payload.new?.student_name
              }
            }));
          }
          // Refresh data when new form is submitted
          refreshData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'no_dues_status',
          filter: `department_name=eq.${user.department_name}`
        },
        (payload) => {
          console.log('🔄 Department status updated:', payload.new?.status);
          // Refresh data when status changes for this department
          refreshData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'no_dues_status',
          filter: `department_name=eq.${user.department_name}`
        },
        (payload) => {
          console.log('📋 New status record for department');
          // Refresh when new status is created for this department
          refreshData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time updates active');
          isSubscribed = true;
          retryCount = 0;
          // Clear any existing polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            console.warn('⚠️ Real-time connection failed. Using manual refresh.');
            isSubscribed = false;
            // Only start polling after max retries
            if (!pollingInterval) {
              pollingInterval = setInterval(() => {
                if (!refreshing) {
                  refreshData();
                }
              }, 60000); // Poll every 60 seconds (reduced frequency)
            }
          }
        } else if (status === 'CLOSED') {
          // Connection closed - don't spam console
          if (isSubscribed) {
            console.log('🔌 Real-time connection closed');
            isSubscribed = false;
          }
        }
      });

    // Fallback polling - only start after 10 seconds if definitely not connected
    const fallbackTimeout = setTimeout(() => {
      if (!isSubscribed && !pollingInterval && retryCount >= MAX_RETRIES) {
        console.log('⏰ Starting fallback polling (real-time unavailable)');
        pollingInterval = setInterval(() => {
          if (!refreshing) {
            refreshData();
          }
        }, 60000); // Poll every 60 seconds
      }
    }, 10000); // Wait 10 seconds before fallback

    return () => {
      clearTimeout(fallbackTimeout);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      supabase.removeChannel(channel);
    };
  }, [userId, user?.department_name, refreshData, refreshing]);

  return {
    user,
    userId,
    loading,
    refreshing,
    requests,
    error,
    lastUpdate,
    fetchDashboardData,
    refreshData
  };
}