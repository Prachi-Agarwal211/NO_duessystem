'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { realtimeManager } from '@/lib/realtimeManager';
import { subscribeToRealtime } from '@/lib/supabaseRealtime';

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

  // ✅ REQUEST DEDUPLICATION: Prevent multiple simultaneous fetches
  const pendingDashboardRequest = useRef(null);
  const pendingStatsRequest = useRef(null);

  // ✅ TIMEOUT PROTECTION: Prevent infinite loading states
  const loadingTimeoutRef = useRef(null);
  const statsTimeoutRef = useRef(null);

  // ⚡ PERFORMANCE: Fetch user data with minimal queries
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

  // ⚡ PERFORMANCE: Parallel fetch of dashboard + stats for instant load
  const fetchDashboardData = useCallback(async (searchTerm = '', isRefresh = false) => {
    // Store search term for real-time refresh
    currentSearchRef.current = searchTerm;

    // ✅ DEDUPLICATION: If already fetching, return existing promise
    if (pendingDashboardRequest.current) {
      console.log('⏭️ Dashboard fetch already in progress, reusing...');
      return pendingDashboardRequest.current;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    // ✅ TIMEOUT PROTECTION: Clear loading after 30 seconds max (reduced from 45s)
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Dashboard fetch timeout - clearing loading state');
      setLoading(false);
      setRefreshing(false);
      setError('Request timeout. Please try again.');
      pendingDashboardRequest.current = null;
    }, 30000);

    const fetchPromise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          throw new Error('Session expired. Please login again.');
        }

        // Build query params with search term
        const params = new URLSearchParams({
          userId: session.user.id,
          page: 1,
          limit: 50,
          // ⚡ PERFORMANCE: Include stats in dashboard request to reduce round trips
          includeStats: 'true',
          // ✅ REAL-TIME: Use actual timestamp for immediate updates
          _t: Date.now()
        });

        // Add search term if present
        if (searchTerm.trim()) {
          params.append('search', searchTerm.trim());
        }

        // ⚡ CRITICAL: Single combined request for dashboard + stats (NO CACHE for real-time updates)
        const response = await fetch(`/api/staff/dashboard?${params}`, {
          method: 'GET',
          cache: 'no-store', // ✅ Disable cache for real-time stats
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch dashboard data');
        }

        if (result.success) {
          // Extract applications
          const applications = result.data.applications || [];

          // Filter out applications with null forms (orphaned records)
          const validApplications = applications.filter(item => {
            if (!item.no_dues_forms) {
              console.warn('⚠️ Orphaned status record found, skipping:', item.form_id);
              return false;
            }
            return true;
          });

          // Preserve full application object (contains status, department_name, etc.)
          // AND the nested no_dues_forms
          setRequests(validApplications);

          // ⚡ PERFORMANCE: Set stats from same response (if included)
          if (result.data.stats) {
            console.log('📊 Staff dashboard stats received:', {
              hasStats: !!result.data.stats,
              pending: result.data.stats.pending,
              approved: result.data.stats.approved,
              rejected: result.data.stats.rejected,
              total: result.data.stats.total,
              department: result.data.stats.department
            });
            setStats(result.data.stats);
          } else {
            console.warn('⚠️ No stats included in dashboard response');
          }

          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message);
      } finally {
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        setLoading(false);
        setRefreshing(false);
        pendingDashboardRequest.current = null;
      }
    })();

    pendingDashboardRequest.current = fetchPromise;
    return fetchPromise;
  }, []);

  // Store latest function in ref
  fetchDashboardDataRef.current = fetchDashboardData;

  // ⚡ PERFORMANCE: Lazy load stats only if not included in dashboard response
  const fetchStats = useCallback(async () => {
    if (!userId) return;
    if (stats) return; // Skip if already loaded from dashboard

    // ✅ DEDUPLICATION: If already fetching, return existing promise
    if (pendingStatsRequest.current) {
      console.log('⏭️ Stats fetch already in progress, reusing...');
      return pendingStatsRequest.current;
    }

    setStatsLoading(true);

    // ✅ TIMEOUT PROTECTION: Clear loading after 20 seconds max (reduced from 30s)
    if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
    statsTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Stats fetch timeout - clearing loading state');
      setStatsLoading(false);
      pendingStatsRequest.current = null;
    }, 20000);

    const fetchPromise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          throw new Error('Session expired. Please login again.');
        }

        // ✅ REAL-TIME: No caching for immediate stats updates
        const response = await fetch(`/api/staff/stats?_t=${Date.now()}`, {
          cache: 'no-store',
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
        if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
        setStatsLoading(false);
        pendingStatsRequest.current = null;
      }
    })();

    pendingStatsRequest.current = fetchPromise;
    return fetchPromise;
  }, [userId, stats]);

  // Store latest function in ref
  fetchStatsRef.current = fetchStats;

  // ⚡ PERFORMANCE: Combined initial load - fetch everything at once
  useEffect(() => {
    if (userId) {
      // Dashboard fetch will include stats, no separate call needed
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only depend on userId - fetchDashboardData is stable via useCallback

  // Manual refresh function - stable reference using refs to avoid stale closures
  // ✅ FIX: Returns Promise.all() so RealtimeManager can prevent race conditions
  const refreshData = useCallback(() => {
    const promises = [];

    // Use refs to get latest functions
    if (fetchDashboardDataRef.current) {
      promises.push(fetchDashboardDataRef.current(currentSearchRef.current, true));
    }

    // ⚡ PERFORMANCE: No separate stats fetch - included in dashboard response

    // ✅ CRITICAL: Return Promise.all() so manager knows when refresh completes
    return Promise.all(promises);
  }, []); // Empty deps - stable function using refs

  // ==================== REAL-TIME SUBSCRIPTION ====================
  // NEW ARCHITECTURE: Use centralized realtime service + event manager
  useEffect(() => {
    if (!userId || !user?.department_name) return;

    let unsubscribeRealtime;
    let unsubscribeDeptAction;
    let unsubscribeGlobal;
    let retryTimeout;
    let debounceTimer = null; // ⚡ DEBOUNCE: Prevent rapid refreshes

    const setupRealtime = async () => {
      console.log('🔌 Staff dashboard setting up PUBLIC realtime for', user.department_name);
      console.log('📡 Subscribing to global event stream (no auth required)');

      // Subscribe to PUBLIC global realtime service
      unsubscribeRealtime = await subscribeToRealtime();

      // ⚡ DEBOUNCED REFRESH: Wait 1 second before refreshing to batch updates
      const debouncedRefresh = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log('⚡ Soft Refreshing after debounce...');
          if (fetchDashboardDataRef.current) {
            fetchDashboardDataRef.current(currentSearchRef.current, true);
          }
        }, 1000); // Wait 1 second to batch rapid updates
      };

      // Subscribe to specific events via RealtimeManager
      unsubscribeDeptAction = realtimeManager.subscribe('departmentAction', (analysis) => {
        // Targeted Update Logic for Department Actions
        const relevantUpdates = Object.values(analysis.latestEvents || {}).filter(event =>
          event.data?.new?.department_name === user.department_name
        );

        if (relevantUpdates.length > 0) {
          console.log('⚡ Performing TARGETED update for', relevantUpdates.length, 'items');

          setRequests(prevRequests => {
            const newRequests = [...prevRequests];
            let needsRefresh = false;

            relevantUpdates.forEach(event => {
              const formId = event.formId;
              const newStatus = event.data.new?.status;
              const index = newRequests.findIndex(r => r.no_dues_forms.id === formId);

              if (index !== -1) {
                // Update existing item locally
                newRequests[index] = {
                  ...newRequests[index],
                  status: newStatus, // Update the department-specific status if this is that table
                  // Note: 'requests' logic is complex, might need deeper merge.
                  // For now, if we match, we try to update.
                };

                // If status changed to something that moves it out of 'pending', we might want to just refresh
                // or filter it out. 
                if (activeTab === 'pending' && newStatus !== 'pending') {
                  // It moved out of pending!
                  // We could filter it out: newRequests.splice(index, 1);
                  needsRefresh = true; // Simpler to refresh for now to be safe
                }
              } else {
                // New item for us?
                needsRefresh = true;
              }
            });

            if (needsRefresh) {
              debouncedRefresh();
              return prevRequests;
            }

            return newRequests;
          });
        }

        // Fallback: If we didn't handle it precisely or unsure, refresh
        if (relevantUpdates.length === 0 && analysis.formIds.length > 0) {
          debouncedRefresh();
        }
      });

      // Also subscribe to global updates for new submissions and completions
      unsubscribeGlobal = realtimeManager.subscribe('globalUpdate', (analysis) => {
        // Only refresh for new submissions or completions that might affect us
        if (analysis.hasNewSubmission || analysis.hasCompletion) {
          console.log('🚀 Scheduling debounced refresh from global update');
          debouncedRefresh();
        }
      });
    };

    setupRealtime();

    return () => {
      console.log('🧹 Staff dashboard unsubscribing from realtime');
      if (retryTimeout) clearTimeout(retryTimeout);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (unsubscribeRealtime) unsubscribeRealtime();
      if (unsubscribeDeptAction) unsubscribeDeptAction();
      if (unsubscribeGlobal) unsubscribeGlobal();

      // ✅ CLEANUP: Clear all timeouts
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user?.department_name]); // Removed refreshData - using refs instead

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
    fetchStats,
    // Manual refresh function for UI buttons
    handleManualRefresh: refreshData
  };
}