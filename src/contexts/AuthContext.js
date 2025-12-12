'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * AuthProvider Component
 * 
 * Centralized authentication management with Remember Me functionality.
 * Features:
 * - Session persistence with configurable duration
 * - Auto-login for returning users
 * - Role-based redirects
 * - Secure token storage
 * - Session refresh handling
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRemembered, setIsRemembered] = useState(false);
  const router = useRouter();

  // Storage keys
  const REMEMBER_ME_KEY = 'jecrc-remember-me';
  const LAST_LOGIN_KEY = 'jecrc-last-login';
  const SESSION_EXPIRY_KEY = 'jecrc-session-expiry';

  /**
   * Check if Remember Me is enabled
   */
  const checkRememberMe = () => {
    if (typeof window === 'undefined') return false;
    const remembered = localStorage.getItem(REMEMBER_ME_KEY);
    return remembered === 'true';
  };

  /**
   * Get session expiry time
   */
  const getSessionExpiry = () => {
    if (typeof window === 'undefined') return null;
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    return expiry ? parseInt(expiry, 10) : null;
  };

  /**
   * Check if session has expired
   */
  const isSessionExpired = () => {
    const expiry = getSessionExpiry();
    if (!expiry) return true;
    return Date.now() > expiry;
  };

  /**
   * Set Remember Me preference
   */
  const setRememberMe = (remember, customDuration = null) => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(REMEMBER_ME_KEY, remember.toString());
    setIsRemembered(remember);
    
    if (remember) {
      // Default: 30 days for Remember Me, 24 hours otherwise
      const duration = customDuration || (remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000);
      const expiry = Date.now() + duration;
      localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
      localStorage.setItem(LAST_LOGIN_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(SESSION_EXPIRY_KEY);
    }
  };

  /**
   * Load user profile
   */
  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  };

  /**
   * Sign in with Remember Me
   */
  const signIn = async (email, password, rememberMe = false) => {
    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw authError;

      if (!authData.user || !authData.session) {
        throw new Error('Login failed. Please try again.');
      }

      // Wait for session to be established
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load user profile
      const userProfile = await loadProfile(authData.user.id);

      if (!userProfile || (userProfile.role !== 'department' && userProfile.role !== 'admin')) {
        await supabase.auth.signOut();
        throw new Error('Access denied. Only department staff and administrators can log in here.');
      }

      // Set user state
      setUser(authData.user);
      setProfile(userProfile);

      // Set Remember Me preference
      setRememberMe(rememberMe);

      return {
        success: true,
        user: authData.user,
        profile: userProfile,
        redirectTo: userProfile.role === 'admin' ? '/admin' : '/staff/dashboard'
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  /**
   * Sign out
   */
  const signOut = async (signOutAllDevices = false) => {
    try {
      if (signOutAllDevices) {
        // Sign out from all devices by revoking all sessions
        await supabase.auth.signOut({ scope: 'global' });
      } else {
        // Sign out from current device only
        await supabase.auth.signOut({ scope: 'local' });
      }

      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(REMEMBER_ME_KEY);
        localStorage.removeItem(LAST_LOGIN_KEY);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
      }

      setUser(null);
      setProfile(null);
      setIsRemembered(false);

      router.push('/staff/login');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  /**
   * Refresh session
   */
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user.id);

        // Extend session if Remember Me is enabled
        if (checkRememberMe()) {
          setRememberMe(true);
        }
      }

      return data.session;
    } catch (error) {
      console.error('Session refresh error:', error);
      return null;
    }
  };

  /**
   * Get last login time
   */
  const getLastLogin = () => {
    if (typeof window === 'undefined') return null;
    const lastLogin = localStorage.getItem(LAST_LOGIN_KEY);
    return lastLogin ? new Date(parseInt(lastLogin, 10)) : null;
  };

  /**
   * Get session time remaining (in milliseconds)
   */
  const getSessionTimeRemaining = () => {
    const expiry = getSessionExpiry();
    if (!expiry) return 0;
    const remaining = expiry - Date.now();
    return Math.max(0, remaining);
  };

  /**
   * Format session time remaining
   */
  const formatSessionTimeRemaining = () => {
    const remaining = getSessionTimeRemaining();
    if (remaining === 0) return 'Expired';

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if session has expired
        const remembered = checkRememberMe();
        setIsRemembered(remembered);

        if (remembered && isSessionExpired()) {
          // Session expired, sign out
          await signOut();
          setLoading(false);
          return;
        }

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);

          // Extend session if Remember Me is enabled
          if (remembered) {
            setRememberMe(true);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setIsRemembered(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
        // Extend session if Remember Me is enabled
        if (checkRememberMe()) {
          setRememberMe(true);
        }
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auto-refresh session every 55 minutes (tokens expire after 1 hour)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      if (checkRememberMe() && !isSessionExpired()) {
        await refreshSession();
      }
    }, 55 * 60 * 1000); // 55 minutes

    return () => clearInterval(interval);
  }, [user]);

  const value = {
    user,
    profile,
    loading,
    isRemembered,
    signIn,
    signOut,
    refreshSession,
    setRememberMe,
    getLastLogin,
    getSessionTimeRemaining,
    formatSessionTimeRemaining,
    isSessionExpired,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;