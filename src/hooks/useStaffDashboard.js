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
        limit: 50,
        _t: Date.now() // Cache buster to ensure fresh data
      });

      // Add search term if present
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await fetch(`/api/staff/dashboard?${params}`, {
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
  // NEW ARCHITECTURE: Use centralized realtime service + event manager
  useEffect(() => {
    if (!userId || !user?.department_name) return;

    let unsubscribeRealtime;
    let unsubscribeDeptAction;
    let unsubscribeGlobal;
    let retryTimeout;

    const setupRealtime = async () => {
      console.log('🔌 Staff dashboard setting up PUBLIC realtime for', user.department_name);
      console.log('📡 Subscribing to global event stream (no auth required)');

      // Subscribe to PUBLIC global realtime service
      // No session check needed - channel is public
      // Dashboard access is already protected by middleware
      unsubscribeRealtime = await subscribeToRealtime();

      // Subscribe to specific events via RealtimeManager
      // Department staff should respond to department-specific actions
      unsubscribeDeptAction = realtimeManager.subscribe('departmentAction', (analysis) => {
        console.log('📋 Staff dashboard received department action:', {
          affectedForms: analysis.formIds.length,
          departments: Array.from(analysis.departmentActions.keys()),
          ourDepartment: user.department_name,
          match: analysis.departmentActions.has(user.department_name)
        });

        // Check if our department is involved
        const ourDepartmentInvolved = analysis.departmentActions.has(user.department_name);

        // Add a small delay to ensure proper digestion of previous updates
        setTimeout(() => {
          if (ourDepartmentInvolved || analysis.formIds.length > 0) {
            console.log('🔄 Triggering staff dashboard refresh from department action...');
            // Refresh data - RealtimeManager handles deduplication
            refreshData();
          }
        }, 100);
      });

      // Also subscribe to global updates for new submissions and completions
      unsubscribeGlobal = realtimeManager.subscribe('globalUpdate', (analysis) => {
        // Only refresh for new submissions or completions that might affect us
        if (analysis.hasNewSubmission || analysis.hasCompletion) {
          console.log('📊 Staff dashboard received global update:', {
            newSubmission: analysis.hasNewSubmission,
            completion: analysis.hasCompletion,
            affectedForms: analysis.formIds.length
          });

          console.log('🚀 Executing refreshData() for staff dashboard');
          refreshData();
        }
      });
    };

    setupRealtime();

    return () => {
      console.log('🧹 Staff dashboard unsubscribing from realtime');
      if (retryTimeout) clearTimeout(retryTimeout);
      if (unsubscribeRealtime) unsubscribeRealtime();
      if (unsubscribeDeptAction) unsubscribeDeptAction();
      if (unsubscribeGlobal) unsubscribeGlobal();
    };
  }, [userId, user?.department_name, refreshData]);

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