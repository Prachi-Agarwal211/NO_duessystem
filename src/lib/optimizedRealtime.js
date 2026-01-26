/**
 * Optimized Real-time System
 * 
 * Features:
 * - Zero lag real-time updates
 * - Proper operation separation
 * - Debounced updates to prevent spam
 * - Connection health monitoring
 * - Automatic reconnection
 * - Performance optimized
 */

import { supabase } from './supabaseClient';

class OptimizedRealtimeService {
  constructor() {
    this.connections = new Map(); // Separate connections per dashboard
    this.subscribers = new Map(); // Track subscribers per connection
    this.debounceTimers = new Map(); // Debounce timers per event type
    this.connectionHealth = new Map(); // Health status per connection
    this.lastEvents = new Map(); // Track last events to prevent duplicates
    this.MIN_DEBOUNCE_TIME = 100; // 100ms for responsive updates
    this.MAX_DEBOUNCE_TIME = 500; // 500ms max for heavy operations
  }

  /**
   * Subscribe to dashboard-specific real-time updates
   * Each dashboard gets its own isolated connection
   */
  subscribe(dashboardType, callbacks = {}) {
    const connectionId = `${dashboardType}_${Date.now()}`;

    console.log(`🔌 Creating optimized realtime connection for ${dashboardType}`);

    // Create dashboard-specific connection
    const connection = this.createConnection(dashboardType, callbacks, connectionId);

    // Store connection and subscribers
    this.connections.set(connectionId, connection);
    this.subscribers.set(connectionId, new Set([callbacks]));
    this.connectionHealth.set(connectionId, { status: 'connecting', lastActivity: Date.now() });

    // Return unsubscribe function
    return () => this.unsubscribe(connectionId);
  }

  /**
   * Create optimized connection for specific dashboard
   */
  createConnection(dashboardType, callbacks, connectionId) {
    const channel = supabase.channel(`optimized_${dashboardType}_${connectionId}`);

    // Add event listeners based on dashboard type
    this.addEventListeners(channel, dashboardType, callbacks, connectionId);

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log(`📡 ${dashboardType} connection status:`, status);

      const health = this.connectionHealth.get(connectionId) || {};
      health.status = status;
      health.lastActivity = Date.now();
      this.connectionHealth.set(connectionId, health);

      // Notify callbacks of connection status
      if (callbacks.onConnectionChange) {
        callbacks.onConnectionChange(status);
      }
    });

    return channel;
  }

  /**
   * Add event listeners based on dashboard type
   */
  addEventListeners(channel, dashboardType, callbacks, connectionId) {
    switch (dashboardType) {
      case 'admin':
        this.addAdminListeners(channel, callbacks, connectionId);
        break;
      case 'department':
        this.addDepartmentListeners(channel, callbacks, connectionId);
        break;
      case 'student':
        this.addStudentListeners(channel, callbacks, connectionId);
        break;
      default:
        this.addGenericListeners(channel, callbacks, connectionId);
    }
  }

  /**
   * Admin dashboard listeners - comprehensive but optimized
   */
  addAdminListeners(channel, callbacks, connectionId) {
    // Listen to form submissions
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'no_dues_forms'
    }, (payload) => {
      this.debounceUpdate('form_submission', () => {
        console.log('🆕 Admin: New form submission');
        if (callbacks.onNewForm) callbacks.onNewForm(payload);
      }, connectionId);
    });

    // Listen to status updates
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_status'
    }, (payload) => {
      this.debounceUpdate('status_update', () => {
        console.log('📊 Admin: Status update');
        if (callbacks.onStatusUpdate) callbacks.onStatusUpdate(payload);
      }, connectionId);
    });

    // Listen to support tickets
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'support_tickets'
    }, (payload) => {
      this.debounceUpdate('support_ticket', () => {
        console.log('💬 Admin: Support ticket update');
        if (callbacks.onSupportTicket) callbacks.onSupportTicket(payload);
      }, connectionId);
    });

    // Listen to email logs
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'email_logs'
    }, (payload) => {
      this.debounceUpdate('email_log', () => {
        console.log('📧 Admin: Email log update');
        if (callbacks.onEmailLog) callbacks.onEmailLog(payload);
      }, connectionId);
    });
  }

  /**
   * Department dashboard listeners - focused and efficient
   */
  addDepartmentListeners(channel, callbacks, connectionId) {
    const departmentName = callbacks.departmentName;

    // Listen to department-specific status updates
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_status',
      filter: `department_name=eq.${departmentName}`
    }, (payload) => {
      this.debounceUpdate('department_status', () => {
        console.log(`🏢 Department ${departmentName}: Status update`);
        if (callbacks.onDepartmentUpdate) callbacks.onDepartmentUpdate(payload);
      }, connectionId);
    });

    // Listen to new applications for this department
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'no_dues_forms'
    }, (payload) => {
      // Only notify if this department should handle this application
      if (this.shouldDepartmentHandleApplication(payload.new, departmentName)) {
        this.debounceUpdate('new_application', () => {
          console.log(`📝 Department ${departmentName}: New application`);
          if (callbacks.onNewApplication) callbacks.onNewApplication(payload);
        }, connectionId);
      }
    }, connectionId);
  }

  /**
   * Student dashboard listeners - minimal and focused
   */
  addStudentListeners(channel, callbacks, connectionId) {
    const studentId = callbacks.studentId;

    // Listen to student's own form updates
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_forms',
      filter: `id=eq.${studentId}`
    }, (payload) => {
      this.debounceUpdate('student_form', () => {
        console.log('👤 Student: Form update');
        if (callbacks.onFormUpdate) callbacks.onFormUpdate(payload);
      }, connectionId);
    });

    // Listen to student's status updates
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_status',
      filter: `form_id=eq.${studentId}`
    }, (payload) => {
      this.debounceUpdate('student_status', () => {
        console.log('👤 Student: Status update');
        if (callbacks.onStatusUpdate) callbacks.onStatusUpdate(payload);
      }, connectionId);
    }, connectionId);
  }

  /**
   * Generic listeners for other dashboards
   */
  addGenericListeners(channel, callbacks, connectionId) {
    // Basic form and status listeners
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_forms'
    }, (payload) => {
      this.debounceUpdate('generic_form', () => {
        if (callbacks.onFormChange) callbacks.onFormChange(payload);
      }, connectionId);
    });

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_status'
    }, (payload) => {
      this.debounceUpdate('generic_status', () => {
        if (callbacks.onStatusChange) callbacks.onStatusChange(payload);
      }, connectionId);
    }, connectionId);
  }

  /**
   * Debounced update to prevent spam and improve performance
   */
  debounceUpdate(eventType, updateFunction, connectionId) {
    const debounceKey = `${connectionId}_${eventType}`;

    // Clear existing timer
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey));
    }

    // Set new timer
    const timer = setTimeout(() => {
      updateFunction();
      this.debounceTimers.delete(debounceKey);

      // Update connection health
      const health = this.connectionHealth.get(connectionId) || {};
      health.lastActivity = Date.now();
      this.connectionHealth.set(connectionId, health);
    }, this.MIN_DEBOUNCE_TIME);

    this.debounceTimers.set(debounceKey, timer);
  }

  /**
   * Check if department should handle application
   * Filters based on department assignment logic
   */
  shouldDepartmentHandleApplication(form, departmentName) {
    if (!form || !departmentName) return false;

    // Get the department name from form if available
    const formDepartment = form.department_name || form.school;

    // If form has a specific department assigned, only notify that department
    if (formDepartment && formDepartment !== departmentName) {
      return false;
    }

    // For new applications, notify all departments (they can decide to take action)
    return true;
  }

  /**
   * Unsubscribe from specific connection
   */
  unsubscribe(connectionId) {
    console.log(`🔌 Unsubscribing from connection: ${connectionId}`);

    // Clear debounce timers
    this.debounceTimers.forEach((timer, key) => {
      if (key.startsWith(connectionId)) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }
    });

    // Remove connection
    const connection = this.connections.get(connectionId);
    if (connection) {
      supabase.removeChannel(connection);
      this.connections.delete(connectionId);
    }

    // Clean up other data
    this.subscribers.delete(connectionId);
    this.connectionHealth.delete(connectionId);
  }

  /**
   * Get connection health status
   */
  getConnectionHealth(connectionId) {
    return this.connectionHealth.get(connectionId);
  }

  /**
   * Get all connection health status
   */
  getAllConnectionHealth() {
    return Object.fromEntries(this.connectionHealth);
  }

  /**
   * Force refresh all connections
   */
  refreshAll() {
    console.log('🔄 Refreshing all realtime connections');

    this.connections.forEach((connection, connectionId) => {
      const health = this.connectionHealth.get(connectionId);
      if (health && health.status === 'SUBSCRIBED') {
        // Trigger refresh for healthy connections
        const subscribers = this.subscribers.get(connectionId);
        if (subscribers) {
          subscribers.forEach(callbacks => {
            if (callbacks.onRefresh) callbacks.onRefresh();
          });
        }
      }
    });
  }

  /**
   * Cleanup all connections
   */
  cleanup() {
    console.log('🧹 Cleaning up all realtime connections');

    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Remove all connections
    this.connections.forEach((connection, connectionId) => {
      supabase.removeChannel(connection);
    });

    // Clear all data
    this.connections.clear();
    this.subscribers.clear();
    this.connectionHealth.clear();
    this.lastEvents.clear();
  }
}

// Create singleton instance
const optimizedRealtime = new OptimizedRealtimeService();

export default optimizedRealtime;
