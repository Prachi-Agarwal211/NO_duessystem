/**
 * Unified Realtime Subscription System
 * 
 * This module provides a SINGLE global WebSocket connection for all realtime updates.
 * Instead of each dashboard creating its own subscription, they all share this one.
 * 
 * Benefits:
 * - Single WebSocket connection (not 3-4 per user)
 * - Centralized event processing through RealtimeManager
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring
 * - Proper cleanup and resource management
 */

import { supabase } from './supabaseClient';
import { realtimeManager } from './realtimeManager';

class SupabaseRealtimeService {
  constructor() {
    this.channel = null;
    this.subscriberCount = 0;
    this.isInitializing = false;
    this.reconnectTimeout = null;
    this.reconnectAttempts = 0;
    this.MAX_RECONNECT_ATTEMPTS = Infinity; // Infinite reconnection attempts
    this.MAX_RECONNECT_DELAY = 30000; // Cap at 30 seconds
    this.connectionStatus = 'disconnected';
    this.lastConnectionTime = null;
    this.userInitiatedDisconnect = false;
  }

  /**
   * Subscribe to realtime updates
   * Multiple components can call this - only ONE WebSocket connection is created
   */
  async subscribe() {
    this.subscriberCount++;
    console.log(`📊 Realtime subscriber count: ${this.subscriberCount}`);

    // If already subscribed or initializing, just return cleanup function
    if (this.channel || this.isInitializing) {
      return () => this.unsubscribe();
    }

    // Initialize the single global subscription
    await this.initialize();
    
    return () => this.unsubscribe();
  }

  /**
   * Initialize the global realtime subscription
   * PUBLIC MODE: Listens to all events regardless of auth context
   * This is safe because:
   * - Dashboards are protected by authentication middleware
   * - Only authenticated users can access dashboards
   * - RLS policies still control data access via API calls
   */
  async initialize() {
    if (this.isInitializing || this.channel) {
      return;
    }

    this.isInitializing = true;

    try {
      console.log('🔌 Initializing PUBLIC global realtime subscription...');
      console.log('📡 This listens to ALL database events for instant updates');
      console.log('🔓 Public mode: Events from anon AND authenticated users');

      // Create a single PUBLIC channel for ALL realtime events
      // This ensures events from students (anon) are visible to staff/admin (authenticated)
      this.channel = supabase
        .channel('global-no-dues-realtime', {
          config: {
            broadcast: { self: true },
            presence: { key: '' },
          }
        })
        
        // ==================== EVENT 1: NEW FORM SUBMISSION ====================
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'no_dues_forms'
          },
          (payload) => {
            console.log('🆕 New form submission:', payload.new?.registration_no);
            
            // Queue event for batched processing
            realtimeManager.queueEvent('form_submission', payload);
            
            // Dispatch browser event for notifications
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('new-submission', {
                detail: {
                  registrationNo: payload.new?.registration_no,
                  studentName: payload.new?.student_name,
                  formId: payload.new?.id
                }
              }));
            }
          }
        )
        
        // ==================== EVENT 2: FORM STATUS CHANGE ====================
        // This fires when form goes from 'pending' to 'completed' or 'rejected'
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'no_dues_forms'
          },
          (payload) => {
            // Only process if status actually changed
            if (payload.old?.status !== payload.new?.status) {
              console.log('🔄 Form status changed:', 
                payload.new?.registration_no, 
                `${payload.old?.status} → ${payload.new?.status}`
              );
              
              // Queue appropriate event type
              const eventType = payload.new?.status === 'completed' 
                ? 'form_completion' 
                : 'form_status_update';
              
              realtimeManager.queueEvent(eventType, payload);
              
              // Dispatch completion event if completed
              if (payload.new?.status === 'completed' && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('form-completed', {
                  detail: {
                    registrationNo: payload.new?.registration_no,
                    studentName: payload.new?.student_name,
                    formId: payload.new?.id
                  }
                }));
              }
            }
          }
        )
        
        // ==================== EVENT 3: DEPARTMENT ACTION ====================
        // This fires when a department approves/rejects
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'no_dues_status'
          },
          (payload) => {
            // Only process if status actually changed
            if (payload.old?.status !== payload.new?.status) {
              console.log('📋 Department action:', 
                payload.new?.department_name,
                `${payload.old?.status} → ${payload.new?.status}`
              );
              
              realtimeManager.queueEvent('department_status_update', payload);
            }
          }
        )
        
        // ==================== EVENT 4: NEW STATUS RECORDS ====================
        // This fires when department status records are created for a new form
        // NOTE: With optimized triggers, this should only fire ONCE per form submission
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'no_dues_status'
          },
          (payload) => {
            console.log('📝 Department status created:', payload.new?.department_name);
            
            // Queue for batching - multiple INSERTs will be processed together
            realtimeManager.queueEvent('department_status_created', payload);
          }
        )
        
        // ==================== SUBSCRIPTION STATUS ====================
        .subscribe((status) => {
          this.handleSubscriptionStatus(status);
        });

      this.lastConnectionTime = Date.now();
      
    } catch (error) {
      console.error('❌ Error initializing realtime:', error);
      this.isInitializing = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Handle subscription status changes
   */
  handleSubscriptionStatus(status) {
    this.connectionStatus = status;
    realtimeManager.setConnectionStatus(status);
    
    console.log('📡 Global realtime status:', status);

    if (status === 'SUBSCRIBED') {
      console.log('✅ Global realtime connection active');
      this.isInitializing = false;
      this.reconnectAttempts = 0;
      
      // Clear any pending reconnect
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error('❌ Realtime connection error:', status);
      this.isInitializing = false;
      this.scheduleReconnect();
      
    } else if (status === 'CLOSED') {
      if (this.connectionStatus === 'SUBSCRIBED') {
        console.log('🔌 Realtime connection closed');
      }
      this.isInitializing = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff (infinite attempts)
   */
  scheduleReconnect() {
    // Don't reconnect if user explicitly disconnected
    if (this.userInitiatedDisconnect) {
      console.log('⏸️ Skipping reconnect - user initiated disconnect');
      return;
    }

    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;

    // Exponential backoff with cap: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(
      1000 * Math.pow(2, Math.min(this.reconnectAttempts - 1, 5)),
      this.MAX_RECONNECT_DELAY
    );

    console.log(`🔄 Scheduling reconnect attempt #${this.reconnectAttempts} in ${delay}ms`);

    // Notify subscribers of reconnection attempt
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('realtime-reconnecting', {
        detail: {
          attempt: this.reconnectAttempts,
          delay: delay,
          nextRetryTime: Date.now() + delay
        }
      }));
    }

    this.reconnectTimeout = setTimeout(async () => {
      console.log(`🔄 Attempting reconnect #${this.reconnectAttempts}...`);
      
      // Clean up old channel
      if (this.channel) {
        await supabase.removeChannel(this.channel);
        this.channel = null;
      }
      
      // Try to initialize again
      await this.initialize();
    }, delay);
  }

  /**
   * Unsubscribe from realtime updates
   */
  unsubscribe() {
    this.subscriberCount = Math.max(0, this.subscriberCount - 1);
    console.log(`📊 Realtime subscriber count: ${this.subscriberCount}`);

    // Only cleanup if no more subscribers
    if (this.subscriberCount === 0) {
      this.userInitiatedDisconnect = true;
      this.cleanup();
    }
  }

  /**
   * Cleanup all realtime resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up global realtime subscription');

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Remove channel
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }

    // Reset state
    this.isInitializing = false;
    this.reconnectAttempts = 0;
    this.connectionStatus = 'disconnected';
    this.userInitiatedDisconnect = false;
    
    // Flush any pending events in manager
    realtimeManager.flush();
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return {
      status: this.connectionStatus,
      subscriberCount: this.subscriberCount,
      isInitializing: this.isInitializing,
      reconnectAttempts: this.reconnectAttempts,
      lastConnectionTime: this.lastConnectionTime,
      managerHealth: realtimeManager.getConnectionHealth()
    };
  }

  /**
   * Force reconnect (for manual retry)
   */
  async forceReconnect() {
    console.log('🔄 Forcing realtime reconnect...');
    this.userInitiatedDisconnect = false;
    this.reconnectAttempts = 0;
    await this.cleanup();
    if (this.subscriberCount > 0) {
      await this.initialize();
    }
  }

  /**
   * Check if currently reconnecting
   */
  isReconnecting() {
    return this.reconnectTimeout !== null;
  }
}

// Export singleton instance
export const realtimeService = new SupabaseRealtimeService();

// Convenience export for subscriptions
export const subscribeToRealtime = () => realtimeService.subscribe();

// Export for debugging
if (typeof window !== 'undefined') {
  window.realtimeService = realtimeService;
  window.realtimeManager = realtimeManager;
}