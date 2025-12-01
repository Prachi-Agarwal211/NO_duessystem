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
  const refreshData = useCallback(() => {
    console.log('🔄 Refresh triggered - updating dashboard and stats');
    setCurrentPage(page => {
      // Fetch dashboard data with current page
      fetchDashboardData(currentFiltersRef.current, true, page);
      return page;
    });
    // Always fetch fresh stats
    fetchStats();
  }, [fetchDashboardData, fetchStats]);

  // ==================== REAL-TIME SUBSCRIPTION ====================
  // Subscribe to new form submissions and updates for instant dashboard updates
  useEffect(() => {
    if (!userId) return;

    let isSubscribed = false;
    let pollingInterval = null;

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
          // Refresh data when form status changes
          refreshData();
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
          console.log('📋 Department status changed');
          // Refresh when any department status changes
          refreshData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Admin dashboard subscribed to real-time updates');
          console.log('📌 Listening for changes on: no_dues_forms, no_dues_status');
          isSubscribed = true;
          // Clear polling if subscription is active
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('❌ Real-time subscription error:', status, '- falling back to polling');
          isSubscribed = false;
          // Start polling as fallback
          if (!pollingInterval) {
            pollingInterval = setInterval(() => {
              console.log('🔁 Polling fallback - fetching data...');
              if (!refreshing) {
                refreshData();
              }
            }, 30000); // Poll every 30 seconds
          }
        }
      });

    // Fallback polling - only if subscription not active after 5 seconds
    const fallbackTimeout = setTimeout(() => {
      if (!isSubscribed && !pollingInterval) {
        console.log('⏰ Subscription not active, starting fallback polling');
        pollingInterval = setInterval(() => {
          if (!refreshing) {
            refreshData();
          }
        }, 30000); // Poll every 30 seconds
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimeout);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      supabase.removeChannel(channel);
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