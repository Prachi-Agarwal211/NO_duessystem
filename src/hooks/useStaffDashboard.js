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

  // ✅ FIX Problem 21: Use ref for refreshData to avoid subscription recreation
  const refreshDataRef = useRef(null);

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
    
    // ✅ FIX: Only set loading state, let refreshData handle refreshing state
    if (!isRefresh) {
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
      // ✅ FIX: Don't reset refreshing here - let refreshData handle it
    }
  }, []);

  // Manual refresh function - refresh both data and stats
  // ✅ FIX: Now async with Promise.all to prevent race conditions
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchDashboardData(currentSearchRef.current, true),
        fetchStats()
      ]);
    } catch (error) {
      console.error('❌ Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData, fetchStats]);

  // ✅ FIX Problem 21: Keep ref updated to avoid subscription recreation
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  // ==================== REAL-TIME SUBSCRIPTION ====================
  // Subscribe to new form submissions and status updates for instant dashboard updates
  useEffect(() => {
    if (!userId || !user?.department_name) return;

    let isSubscribed = false;
    let refreshTimeout = null;
    let channel = null;
    const DEBOUNCE_DELAY = 500;

    // Debounced refresh to prevent continuous refreshes
    const debouncedRefresh = () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      refreshTimeout = setTimeout(() => {
        if (refreshDataRef.current) {
          console.log('🔄 Debounced refresh triggered');
          refreshDataRef.current();
        }
      }, DEBOUNCE_DELAY);
    };

    // ✅ FIX: Async setup to ensure we have current session
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('❌ No session found for real-time subscription');
        return null;
      }

      console.log('🔌 Setting up real-time for department:', user.department_name);

      // Set up real-time subscription with explicit config
      const ch = supabase
        .channel('staff-dashboard-realtime', {
          config: {
            broadcast: { self: true },
            presence: { key: userId }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'no_dues_forms'
          },
          (payload) => {
            console.log('🔔 New form submission detected:', payload.new?.registration_no);
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('new-staff-submission', {
                detail: {
                  registrationNo: payload.new?.registration_no,
                  studentName: payload.new?.student_name
                }
              }));
            }
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
            debouncedRefresh();
          }
        )
        .subscribe((status, error) => {
          console.log('📡 Staff subscription status:', status);
          
          if (error) {
            console.error('❌ Subscription error:', error);
          }
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time updates active for', user.department_name);
            isSubscribed = true;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('❌ Real-time connection failed:', status);
            isSubscribed = false;
          } else if (status === 'CLOSED') {
            if (isSubscribed) {
              console.log('🔌 Real-time connection closed');
              isSubscribed = false;
            }
          }
        });

      return ch;
    };

    // Initialize real-time subscription
    setupRealtime().then(ch => {
      channel = ch;
    });

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
      console.log('🧹 Cleaned up real-time subscription');
    };
  }, [userId, user?.department_name]);

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