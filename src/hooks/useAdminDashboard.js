'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function useAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Store current filters for refresh
  const currentFiltersRef = useRef({});
  
  // Use refs to store latest functions and avoid stale closures
  const fetchDashboardDataRef = useRef(null);
  const fetchStatsRef = useRef(null);

  // Fetch user data
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // ✅ Use Next.js router instead of window.location
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || userData.role !== 'admin') {
        // ✅ Use Next.js router instead of window.location
        router.push('/unauthorized');
        return;
      }

      setUser(userData);
      setUserId(session.user.id);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error.message);
    }
  };

  const fetchDashboardData = useCallback(async (filters = {}, isRefresh = false, pageOverride = null) => {
    // Always store the latest filters for real-time refresh
    if (Object.keys(filters).length > 0) {
      currentFiltersRef.current = filters;
    }
    
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

      const params = new URLSearchParams({
        page: pageOverride !== null ? pageOverride : currentPage,
        limit: 20,
        ...filters
      });

      const response = await fetch(`/api/admin/dashboard?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      setApplications(result.applications || []);
      setTotalItems(result.pagination?.total || 0);
      setTotalPages(result.pagination?.totalPages || 1);
      setLastUpdate(new Date());
      
      console.log('📊 Admin dashboard data refreshed:', result.applications?.length, 'applications');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage]);

  // Store latest function in ref
  fetchDashboardDataRef.current = fetchDashboardData;

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) return;

      const response = await fetch(`/api/admin/stats?userId=${session.user.id}`);
      const result = await response.json();

      if (response.ok) {
        setStats(result);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Store latest function in ref
  fetchStatsRef.current = fetchStats;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // ✅ Use Next.js router instead of window.location
    router.push('/login');
  };

  // Manual refresh function - stable reference using refs to avoid stale closures
  const refreshData = useCallback(() => {
    console.log('🔄 Refresh triggered - updating dashboard and stats');
    
    // Use refs to get latest functions
    if (fetchDashboardDataRef.current) {
      setCurrentPage(page => {
        // Fetch dashboard data with current page using ref
        fetchDashboardDataRef.current(currentFiltersRef.current, true, page);
        return page;
      });
    }
    
    // Always fetch fresh stats using ref
    if (fetchStatsRef.current) {
      fetchStatsRef.current();
    }
  }, []); // Empty deps - stable function using refs

  // ==================== REAL-TIME SUBSCRIPTION ====================
  // Subscribe to new form submissions and updates for instant dashboard updates
  useEffect(() => {
    if (!userId) return;

    let isSubscribed = false;
    let pollingInterval = null;
    let retryCount = 0;
    let channel = null;
    const MAX_RETRIES = 3;

    // Setup realtime subscription with proper async initialization
    const setupRealtime = async () => {
      try {
        // Verify we have an active session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('❌ No active session - cannot setup realtime');
          return;
        }

        console.log('🔌 Setting up admin realtime subscription...');

        // Set up real-time subscription for new form submissions
        channel = supabase
          .channel('admin-dashboard-realtime')
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
            window.dispatchEvent(new CustomEvent('new-submission', {
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
          table: 'no_dues_forms'
        },
        (payload) => {
          console.log('🔄 Form updated:', payload.new?.registration_no, 'Status:', payload.new?.status);
          // Refresh data when form status changes (e.g., completed when all depts approve)
          refreshData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'no_dues_status'
        },
        (payload) => {
          console.log('📋 Department status updated:', payload.new?.department_name, 'Status:', payload.new?.status);
          // Refresh when any department status changes
          refreshData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'no_dues_status'
        },
        (payload) => {
          console.log('📋 New department status created for:', payload.new?.department_name);
          // Refresh when new department status records are created
          refreshData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Admin realtime updates active');
          isSubscribed = true;
          retryCount = 0;
          // Clear any existing polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Realtime subscription error:', status);
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            console.warn('⚠️ Real-time connection failed after', MAX_RETRIES, 'attempts. Using manual refresh.');
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
          // Connection closed - don't spam console or start aggressive polling
          if (isSubscribed) {
            console.log('🔌 Real-time connection closed');
            isSubscribed = false;
          }
        }
      });
      } catch (error) {
        console.error('❌ Error setting up realtime:', error);
      }
    };

    // Initialize realtime subscription
    setupRealtime();

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
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, refreshData, refreshing]);

  return {
    user,
    userId,
    loading,
    refreshing,
    applications,
    stats,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    lastUpdate,
    fetchDashboardData,
    fetchStats,
    refreshData,
    handleLogout
  };
}