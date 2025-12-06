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

  // ✅ FIX Problem 21: Use ref for refreshData to avoid subscription recreation
  const refreshDataRef = useRef(null);

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
    
    // FIX: Only set loading state, let refreshData handle refreshing state
    if (!isRefresh) {
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
      
      console.log(' Admin dashboard data refreshed:', result.applications?.length, 'applications');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      // FIX: Don't reset refreshing here - let refreshData handle it
    }
  }, [currentPage]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // ✅ Use Next.js router instead of window.location
    router.push('/login');
  };

  // Manual refresh function - properly refresh both dashboard and stats
  // ✅ FIX: Now async with Promise.all to prevent race conditions
  const refreshData = useCallback(async () => {
    console.log('🔄 Refresh triggered - updating dashboard and stats');
    setRefreshing(true);
    try {
      // Await both fetches together to ensure UI updates atomically
      await Promise.all([
        fetchDashboardData(currentFiltersRef.current, true, currentPage),
        fetchStats()
      ]);
    } catch (error) {
      console.error('❌ Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData, fetchStats, currentPage]);

  // ✅ FIX Problem 21: Keep ref updated to avoid subscription recreation
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  // ✅ FIX Problem 9: Optimistic update helper
  const optimisticUpdateApplication = useCallback((updatedApp) => {
    setApplications(prev => {
      const idx = prev.findIndex(app => app.id === updatedApp.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...updatedApp };
        return updated;
      }
      return prev;
    });
  }, []);

  // ==================== REAL-TIME SUBSCRIPTION ====================
  // Subscribe to new form submissions and updates for instant dashboard updates
  useEffect(() => {
    if (!userId) return;

    let isSubscribed = false;
    let pollingInterval = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // Set up real-time subscription for new form submissions
    const channel = supabase
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
          console.log('🔄 Form updated:', payload.new?.registration_no);
          // ✅ FIX Problem 9: Optimistic update first, then full refresh for stats
          if (payload.new) {
            setApplications(prev => {
              const idx = prev.findIndex(app => app.id === payload.new.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...payload.new };
                console.log('⚡ Optimistic update applied for:', payload.new.registration_no);
                return updated;
              }
              return prev;
            });
          }
          // Refresh stats separately (lighter operation)
          if (refreshDataRef.current) refreshDataRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'no_dues_status'
        },
        (payload) => {
          console.log('📋 Department status changed:', payload.eventType);
          // Use ref to avoid dependency issues
          if (refreshDataRef.current) refreshDataRef.current();
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
            console.warn(' Real-time connection failed after', MAX_RETRIES, 'attempts. Using manual refresh.');
            isSubscribed = false;
            // Only start polling after max retries
            if (!pollingInterval) {
              pollingInterval = setInterval(() => {
                if (!refreshing) {
                  refreshData();
                }
              }, 30000); // FIX: Poll every 30 seconds for better responsiveness
            }
          }
        } else if (status === 'CLOSED') {
          // Connection closed - don't spam console or start aggressive polling
          if (isSubscribed) {
            console.log(' Real-time connection closed');
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
  // ✅ FIX Problem 21: Only depend on userId, use ref for refreshData
  }, [userId]);

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