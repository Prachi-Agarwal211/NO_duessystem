'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { realtimeManager } from '@/lib/realtimeManager';
import { subscribeToRealtime } from '@/lib/supabaseRealtime';

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
        ...filters,
        _t: Date.now() // Cache buster to ensure fresh data
      });

      const response = await fetch(`/api/admin/dashboard?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
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

    // Force refresh by setting refreshing state
    setRefreshing(true);

    // Use refs to get latest functions
    if (fetchDashboardDataRef.current) {
      // Always refresh with current filters and current page
      // Pass true for isRefresh to show refreshing indicator
      fetchDashboardDataRef.current(currentFiltersRef.current, true, currentPage);
    }

    // Always fetch fresh stats using ref
    if (fetchStatsRef.current) {
      fetchStatsRef.current();
    }

    // Update last update timestamp to trigger re-render
    setLastUpdate(new Date());
  }, [currentPage]); // Add currentPage as dependency to ensure latest page is used

  // ==================== REAL-TIME SUBSCRIPTION ====================
  // NEW ARCHITECTURE: Use centralized realtime service + event manager
  useEffect(() => {
    if (!userId) return;

    let unsubscribeRealtime;
    let unsubscribeGlobal;
    let retryTimeout;

    const setupRealtime = async () => {
      console.log('🔌 Admin dashboard setting up PUBLIC realtime');
      console.log('📡 Subscribing to global event stream (no auth required)');

      // Subscribe to PUBLIC global realtime service
      // No session check needed - channel is public
      // Dashboard access is already protected by middleware
      unsubscribeRealtime = await subscribeToRealtime();

      // Subscribe to specific events via RealtimeManager
      unsubscribeGlobal = realtimeManager.subscribe('globalUpdate', (analysis) => {
        console.log('📊 Admin dashboard received real-time update:', {
          affectedForms: analysis.formIds.length,
          eventTypes: analysis.eventTypes,
          newSubmission: analysis.hasNewSubmission,
          completion: analysis.hasCompletion,
          departmentAction: analysis.hasDepartmentAction
        });

        console.log('🔄 Triggering admin dashboard refresh from real-time event...');

        // Add a small delay to ensure proper digestion of previous updates
        setTimeout(() => {
          // Refresh data - RealtimeManager handles deduplication
          console.log('🚀 Executing refreshData() for admin dashboard');
          refreshData();
        }, 100);
      });
    };

    setupRealtime();

    return () => {
      console.log('🧹 Admin dashboard unsubscribing from realtime');
      if (retryTimeout) clearTimeout(retryTimeout);
      if (unsubscribeRealtime) unsubscribeRealtime();
      if (unsubscribeGlobal) unsubscribeGlobal();
    };
  }, [userId, refreshData]);

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
    handleLogout,
    // Manual refresh function for UI buttons
    handleManualRefresh: refreshData
  };
}