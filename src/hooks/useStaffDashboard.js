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
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Store current search term for refresh
  const currentSearchRef = useRef('');
  
  // Use refs to store latest functions and avoid stale closures
  const fetchDashboardDataRef = useRef(null);
  const fetchStatsRef = useRef(null);

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

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    if (!userId) return;
    
    setStatsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        throw new Error('Session expired. Please login again.');
      }

      const response = await fetch('/api/staff/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch stats');
      }

      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [userId]);

  // Fetch stats when user is available
  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId, fetchStats]);

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

  // Store latest function in ref
  fetchDashboardDataRef.current = fetchDashboardData;
  fetchStatsRef.current = fetchStats;

  // Manual refresh function - stable reference using refs to avoid stale closures
  const refreshData = useCallback(() => {
    // Use refs to get latest functions
    if (fetchDashboardDataRef.current) {
      fetchDashboardDataRef.current(currentSearchRef.current, true);
    }
    if (fetchStatsRef.current) {
      fetchStatsRef.current();
    }
  }, []); // Empty deps - stable function using refs

  // ==================== REAL-TIME SUBSCRIPTION ====================
  // Subscribe to new form submissions and status updates for instant dashboard updates
  useEffect(() => {
    if (!userId || !user?.department_name) return;

    let isSubscribed = false;
    let refreshTimeout = null;
    let channel = null;
    const DEBOUNCE_DELAY = 2000; // Wait 2 seconds before refreshing to batch updates

    // Debounced refresh to prevent continuous refreshes
    const debouncedRefresh = () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      refreshTimeout = setTimeout(() => {
        if (!refreshing) {
          console.log('🔄 Debounced refresh triggered');
          refreshData();
        }
      }, DEBOUNCE_DELAY);
    };

    // Setup realtime subscription with proper async initialization
    const setupRealtime = async () => {
      try {
        // Verify we have an active session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('❌ No active session - cannot setup realtime');
          return;
        }

        console.log('🔌 Setting up staff realtime subscription for', user.department_name);

        // Set up real-time subscription for new form submissions and status changes
        channel = supabase
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
          // Debounced refresh to avoid continuous updates
          debouncedRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'no_dues_forms'
        },
        (payload) => {
          console.log('🔄 Form status updated:', payload.new?.registration_no, 'Status:', payload.new?.status);
          // Refresh when form overall status changes (e.g., to completed)
          debouncedRefresh();
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
          // Only refresh if the status actually changed to avoid loops
          if (payload.old?.status !== payload.new?.status) {
            console.log('🔄 Department status updated:', payload.old?.status, '->', payload.new?.status);
            debouncedRefresh();
          }
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
          // Debounced refresh to avoid continuous updates
          debouncedRefresh();
        }
      )
      .subscribe((status) => {
        console.log('📡 Staff subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Staff realtime updates active for', user.department_name);
          isSubscribed = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Staff realtime subscription error:', status);
          console.warn('⚠️ Real-time connection issue. Please use manual refresh.');
          isSubscribed = false;
        } else if (status === 'CLOSED') {
          if (isSubscribed) {
            console.log('🔌 Real-time connection closed');
            isSubscribed = false;
          }
        }
      });
      } catch (error) {
        console.error('❌ Error setting up staff realtime:', error);
      }
    };

    // Initialize realtime subscription
    setupRealtime();

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
      console.log('🧹 Cleaned up staff real-time subscription');
    };
  }, [userId, user?.department_name, refreshData, refreshing]);

  return {
    user,
    userId,
    loading,
    refreshing,
    requests,
    stats,
    statsLoading,
    error,
    lastUpdate,
    fetchDashboardData,
    refreshData,
    fetchStats
  };
}