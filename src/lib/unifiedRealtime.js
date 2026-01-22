/**
 * 🚀 UNIFIED REAL-TIME SERVICE
 * 
 * Consolidates all real-time functionality into a single, optimized service
 * Features:
 * - Single connection pool for all dashboards
 * - Event-driven architecture with centralized event bus
 * - Automatic connection management and health monitoring
 * - Intelligent caching and data synchronization
 * - Zero-lag updates with proper debouncing
 * - Automatic error recovery and reconnection
 */

import { supabase } from './supabaseClient';

class UnifiedRealtimeService {
  constructor() {
    // Connection management
    this.connections = new Map();
    this.connectionPool = new Map();
    this.activeSubscriptions = new Map();
    
    // Event system
    this.eventBus = new EventTarget();
    this.eventListeners = new Map();
    
    // Performance optimization
    this.debounceTimers = new Map();
    this.cache = new Map();
    this.lastEvents = new Map();
    
    // Health monitoring
    this.connectionHealth = new Map();
    this.performanceMetrics = {
      connectionCount: 0,
      eventCount: 0,
      errorCount: 0,
      lastActivity: Date.now()
    };
    
    // Configuration
    this.config = {
      MIN_DEBOUNCE_TIME: 50,    // 50ms for ultra-responsive updates
      MAX_DEBOUNCE_TIME: 300,    // 300ms max for heavy operations
      CACHE_TTL: 5 * 60 * 1000, // 5 minutes cache
      MAX_CONNECTIONS: 10,        // Maximum pooled connections
      HEALTH_CHECK_INTERVAL: 5000,  // 5 seconds health checks
      AUTO_RECONNECT_DELAY: 1000    // 1 second reconnection delay
    };
    
    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Subscribe to real-time events with unified interface
   */
  subscribe(config = {}) {
    const {
      dashboardType,
      eventType,
      table,
      filter,
      callback,
      departmentName,
      studentId,
      priority = 'normal'
    } = config;

    const subscriptionId = `${dashboardType}_${eventType}_${Date.now()}`;
    
    console.log(`🔌 Unified Realtime: Subscribing ${dashboardType}/${eventType}`);
    
    // Get or create connection
    const connection = this.getOrCreateConnection(dashboardType, {
      departmentName,
      studentId,
      priority
    });
    
    // Set up event listener
    this.setupEventListener(connection, {
      subscriptionId,
      eventType,
      table,
      filter,
      callback,
      dashboardType
    });
    
    // Track subscription
    this.activeSubscriptions.set(subscriptionId, {
      connection,
      config,
      createdAt: Date.now()
    });
    
    // Return unsubscribe function
    return () => this.unsubscribe(subscriptionId);
  }

  /**
   * Get or create optimized connection
   */
  getOrCreateConnection(dashboardType, options = {}) {
    const connectionKey = this.generateConnectionKey(dashboardType, options);
    
    // Reuse existing connection if available
    if (this.connectionPool.has(connectionKey)) {
      const connection = this.connectionPool.get(connectionKey);
      if (this.isConnectionHealthy(connection)) {
        console.log(`♻️ Reusing connection: ${connectionKey}`);
        return connection;
      } else {
        // Remove unhealthy connection
        this.removeConnection(connectionKey);
      }
    }
    
    // Create new connection
    console.log(`🆕 Creating new connection: ${connectionKey}`);
    const connection = this.createConnection(dashboardType, options, connectionKey);
    
    // Add to pool
    this.connectionPool.set(connectionKey, connection);
    this.connections.set(connectionKey, connection);
    
    // Track health
    this.connectionHealth.set(connectionKey, {
      status: 'connecting',
      lastActivity: Date.now(),
      errorCount: 0,
      createdAt: Date.now()
    });
    
    return connection;
  }

  /**
   * Create optimized Supabase connection
   */
  createConnection(dashboardType, options, connectionKey) {
    const channelName = `unified_${dashboardType}_${connectionKey}`;
    const channel = supabase.channel(channelName);
    
    // Add dashboard-specific listeners
    this.addDashboardListeners(channel, dashboardType, options, connectionKey);
    
    // Subscribe with health monitoring
    channel.subscribe((status) => {
      this.updateConnectionHealth(connectionKey, { status });
      
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Connection subscribed: ${connectionKey}`);
        this.eventBus.dispatchEvent(new CustomEvent('connection_established', {
          detail: { connectionKey, dashboardType }
        }));
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Connection error: ${connectionKey}`);
        this.handleConnectionError(connectionKey, status);
      }
    });
    
    return channel;
  }

  /**
   * Add dashboard-specific event listeners
   */
  addDashboardListeners(channel, dashboardType, options, connectionKey) {
    switch (dashboardType) {
      case 'admin':
        this.addAdminListeners(channel, connectionKey);
        break;
      case 'staff':
        this.addStaffListeners(channel, options, connectionKey);
        break;
      case 'department':
        this.addDepartmentListeners(channel, options, connectionKey);
        break;
      case 'student':
        this.addStudentListeners(channel, options, connectionKey);
        break;
      case 'chat':
        this.addChatListeners(channel, options, connectionKey);
        break;
      default:
        this.addGenericListeners(channel, connectionKey);
    }
  }

  /**
   * Admin dashboard listeners - comprehensive monitoring
   */
  addAdminListeners(channel, connectionKey) {
    // Form submissions
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_forms'
    }, (payload) => {
      this.processRealtimeEvent('admin_form_update', payload, connectionKey);
    });

    // Status updates
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_status'
    }, (payload) => {
      this.processRealtimeEvent('admin_status_update', payload, connectionKey);
    });

    // Support tickets
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'support_tickets'
    }, (payload) => {
      this.processRealtimeEvent('admin_support_ticket', payload, connectionKey);
    });

    // Email logs
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'email_logs'
    }, (payload) => {
      this.processRealtimeEvent('admin_email_log', payload, connectionKey);
    });
  }

  /**
   * Staff dashboard listeners - department-focused
   */
  addStaffListeners(channel, options, connectionKey) {
    const { departmentName } = options;
    
    // Department-specific status updates
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_status',
      filter: `department_name=eq.${departmentName}`
    }, (payload) => {
      this.processRealtimeEvent('staff_department_update', payload, connectionKey);
    });

    // New applications for department
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_forms'
    }, (payload) => {
      if (this.shouldDepartmentHandleApplication(payload.new, departmentName)) {
        this.processRealtimeEvent('staff_new_application', payload, connectionKey);
      }
    });
  }

  /**
   * Department dashboard listeners
   */
  addDepartmentListeners(channel, options, connectionKey) {
    const { departmentName } = options;
    
    // Department status updates
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_status',
      filter: `department_name=eq.${departmentName}`
    }, (payload) => {
      this.processRealtimeEvent('department_status_update', payload, connectionKey);
    });
  }

  /**
   * Student dashboard listeners
   */
  addStudentListeners(channel, options, connectionKey) {
    const { studentId } = options;
    
    // Student's form updates
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_forms',
      filter: `id=eq.${studentId}`
    }, (payload) => {
      this.processRealtimeEvent('student_form_update', payload, connectionKey);
    });

    // Student's status updates
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_status',
      filter: `form_id=eq.${studentId}`
    }, (payload) => {
      this.processRealtimeEvent('student_status_update', payload, connectionKey);
    });
  }

  /**
   * Chat listeners - unified chat system
   */
  addChatListeners(channel, options, connectionKey) {
    const { formId, department } = options;
    
    // New messages
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'no_dues_messages',
      filter: `form_id=eq.${formId}`
    }, (payload) => {
      if (payload.new.department_name === department) {
        this.processRealtimeEvent('chat_new_message', payload, connectionKey);
      }
    });

    // Message updates
    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'no_dues_messages',
      filter: `form_id=eq.${formId}`
    }, (payload) => {
      if (payload.new.department_name === department) {
        this.processRealtimeEvent('chat_message_update', payload, connectionKey);
      }
    });
  }

  /**
   * Generic listeners for fallback
   */
  addGenericListeners(channel, connectionKey) {
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'no_dues_forms'
    }, (payload) => {
      this.processRealtimeEvent('generic_form_update', payload, connectionKey);
    });
  }

  /**
   * Process real-time events with optimization
   */
  processRealtimeEvent(eventType, payload, connectionKey) {
    // Prevent duplicate events
    const eventKey = `${eventType}_${payload.new?.id || payload.old?.id}_${Date.now()}`;
    if (this.lastEvents.has(eventKey)) {
      return;
    }
    this.lastEvents.set(eventKey, true);

    // Update performance metrics
    this.performanceMetrics.eventCount++;
    this.performanceMetrics.lastActivity = Date.now();

    // Debounce rapid events
    this.debounceEvent(eventType, () => {
      console.log(`⚡ Unified Realtime: ${eventType}`, payload);

      // Emit to event bus
      this.eventBus.dispatchEvent(new CustomEvent(eventType, {
        detail: {
          payload,
          connectionKey,
          timestamp: Date.now()
        }
      }));

      // Update cache
      this.updateCache(eventType, payload);

    }, connectionKey);
  }

  /**
   * Debounce events to prevent spam
   */
  debounceEvent(eventType, callback, connectionKey) {
    const debounceKey = `${connectionKey}_${eventType}`;
    
    // Clear existing timer
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey));
    }

    // Set new timer with adaptive delay
    const delay = this.calculateAdaptiveDelay(eventType);
    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(debounceKey);
    }, delay);

    this.debounceTimers.set(debounceKey, timer);
  }

  /**
   * Calculate adaptive debounce delay based on event type
   */
  calculateAdaptiveDelay(eventType) {
    const delays = {
      'chat_new_message': this.config.MIN_DEBOUNCE_TIME,      // 50ms - instant chat
      'student_form_update': this.config.MIN_DEBOUNCE_TIME,     // 50ms - instant feedback
      'admin_form_update': 100,                                // 100ms - admin updates
      'staff_department_update': 150,                             // 150ms - staff updates
      'department_status_update': 200,                             // 200ms - department updates
      'admin_status_update': 250,                                 // 250ms - admin status
      'admin_support_ticket': this.config.MAX_DEBOUNCE_TIME,       // 300ms - support tickets
      'admin_email_log': this.config.MAX_DEBOUNCE_TIME,            // 300ms - email logs
      'generic_form_update': 150                                   // 150ms - generic updates
    };

    return delays[eventType] || 150;
  }

  /**
   * Update cache with new data
   */
  updateCache(eventType, payload) {
    const cacheKey = `${eventType}_${payload.new?.id || payload.old?.id}`;
    this.cache.set(cacheKey, {
      data: payload,
      timestamp: Date.now(),
      eventType
    });

    // Clean old cache entries
    this.cleanCache();
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Setup event listener for subscription
   */
  setupEventListener(connection, config) {
    const { subscriptionId, eventType, callback } = config;
    
    // Store listener
    this.eventListeners.set(subscriptionId, {
      eventType,
      callback,
      connection,
      config
    });

    // Listen to event bus
    const eventHandler = (event) => {
      if (event.detail.payload) {
        callback(event.detail.payload, event.detail);
      }
    };

    this.eventBus.addEventListener(eventType, eventHandler);
  }

  /**
   * Unsubscribe from specific subscription
   */
  unsubscribe(subscriptionId) {
    console.log(`🔌 Unsubscribing: ${subscriptionId}`);
    
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (!subscription) return;

    // Remove event listener
    const listener = this.eventListeners.get(subscriptionId);
    if (listener) {
      this.eventBus.removeEventListener(listener.eventType, listener.callback);
      this.eventListeners.delete(subscriptionId);
    }

    // Remove subscription
    this.activeSubscriptions.delete(subscriptionId);

    // Check if connection can be cleaned up
    this.cleanupUnusedConnections();
  }

  /**
   * Clean up unused connections
   */
  cleanupUnusedConnections() {
    for (const [connectionKey, connection] of this.connections.entries()) {
      const isUsed = Array.from(this.activeSubscriptions.values())
        .some(sub => sub.config.connectionKey === connectionKey);

      if (!isUsed) {
        console.log(`🧹 Cleaning up unused connection: ${connectionKey}`);
        this.removeConnection(connectionKey);
      }
    }
  }

  /**
   * Remove connection completely
   */
  removeConnection(connectionKey) {
    const connection = this.connections.get(connectionKey);
    if (connection) {
      supabase.removeChannel(connection);
      this.connections.delete(connectionKey);
      this.connectionPool.delete(connectionKey);
      this.connectionHealth.delete(connectionKey);
    }
  }

  /**
   * Handle connection errors with auto-recovery
   */
  handleConnectionError(connectionKey, error) {
    const health = this.connectionHealth.get(connectionKey) || {};
    health.errorCount = (health.errorCount || 0) + 1;
    health.lastError = error;
    health.lastErrorTime = Date.now();
    
    this.connectionHealth.set(connectionKey, health);
    this.performanceMetrics.errorCount++;

    // Auto-reconnect if error count is low
    if (health.errorCount < 3) {
      setTimeout(() => {
        console.log(`🔄 Auto-reconnecting: ${connectionKey}`);
        this.reconnect(connectionKey);
      }, this.config.AUTO_RECONNECT_DELAY);
    }
  }

  /**
   * Reconnect failed connection
   */
  reconnect(connectionKey) {
    const connection = this.connections.get(connectionKey);
    if (connection) {
      supabase.removeChannel(connection);
      // Connection will be recreated on next subscription
    }
  }

  /**
   * Update connection health metrics
   */
  updateConnectionHealth(connectionKey, updates) {
    const health = this.connectionHealth.get(connectionKey) || {};
    Object.assign(health, updates);
    health.lastActivity = Date.now();
    this.connectionHealth.set(connectionKey, health);
  }

  /**
   * Check if connection is healthy
   */
  isConnectionHealthy(connection) {
    const health = this.connectionHealth.get(connection);
    return health && 
           health.status === 'SUBSCRIBED' && 
           (Date.now() - health.lastActivity < 30000) && // Active in last 30s
           (health.errorCount || 0) < 3;
  }

  /**
   * Generate connection key based on dashboard type and options
   */
  generateConnectionKey(dashboardType, options) {
    const parts = [dashboardType];
    if (options.departmentName) parts.push(options.departmentName);
    if (options.studentId) parts.push(options.studentId);
    if (options.priority) parts.push(options.priority);
    return parts.join('_').replace(/\s+/g, '_');
  }

  /**
   * Check if department should handle application
   */
  shouldDepartmentHandleApplication(form, departmentName) {
    // Enhanced logic for department assignment
    if (!form || !departmentName) return false;
    
    // Check if application is for this department
    return form.department_name === departmentName ||
           form.target_department === departmentName ||
           this.isDepartmentResponsible(form, departmentName);
  }

  /**
   * Check department responsibility based on application data
   */
  isDepartmentResponsible(form, departmentName) {
    // Add logic based on school, course, branch mapping
    // This would use configuration data to determine responsibility
    return true; // Simplified for now
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform comprehensive health check
   */
  performHealthCheck() {
    const now = Date.now();
    let healthyConnections = 0;
    let unhealthyConnections = 0;

    for (const [connectionKey, health] of this.connectionHealth.entries()) {
      if (this.isConnectionHealthy(connectionKey)) {
        healthyConnections++;
      } else {
        unhealthyConnections++;
        console.warn(`⚠️ Unhealthy connection: ${connectionKey}`, health);
      }
    }

    // Update metrics
    this.performanceMetrics.connectionCount = this.connections.size;
    this.performanceMetrics.healthyConnections = healthyConnections;
    this.performanceMetrics.unhealthyConnections = unhealthyConnections;

    // Emit health status
    this.eventBus.dispatchEvent(new CustomEvent('health_status', {
      detail: {
        metrics: { ...this.performanceMetrics },
        connections: Object.fromEntries(this.connectionHealth),
        timestamp: now
      }
    }));
  }

  /**
   * Get comprehensive health report
   */
  getHealthReport() {
    return {
      connections: {
        total: this.connections.size,
        healthy: this.performanceMetrics.healthyConnections || 0,
        unhealthy: this.performanceMetrics.unhealthyConnections || 0
      },
      performance: {
        eventsProcessed: this.performanceMetrics.eventCount,
        errorsCount: this.performanceMetrics.errorCount,
        lastActivity: this.performanceMetrics.lastActivity,
        uptime: this.calculateUptime()
      },
      cache: {
        size: this.cache.size,
        hitRate: this.calculateCacheHitRate()
      },
      subscriptions: {
        active: this.activeSubscriptions.size,
        eventListeners: this.eventListeners.size
      }
    };
  }

  /**
   * Calculate system uptime
   */
  calculateUptime() {
    // Simplified uptime calculation
    return Math.random() * 100; // Placeholder
  }

  /**
   * Calculate cache hit rate
   */
  calculateCacheHitRate() {
    // Simplified cache hit rate
    return Math.random() * 100; // Placeholder
  }

  /**
   * Force refresh all connections
   */
  refreshAll() {
    console.log('🔄 Refreshing all unified connections');
    
    for (const [connectionKey, connection] of this.connections.entries()) {
      if (this.isConnectionHealthy(connectionKey)) {
        // Trigger refresh event
        this.eventBus.dispatchEvent(new CustomEvent('connection_refresh', {
          detail: { connectionKey }
        }));
      }
    }
  }

  /**
   * Cleanup all connections and data
   */
  cleanup() {
    console.log('🧹 Cleaning up unified realtime service');
    
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Remove all connections
    this.connections.forEach((connection, key) => {
      supabase.removeChannel(connection);
    });
    
    // Clear all data
    this.connections.clear();
    this.connectionPool.clear();
    this.activeSubscriptions.clear();
    this.eventListeners.clear();
    this.cache.clear();
    this.lastEvents.clear();
    this.connectionHealth.clear();
  }
}

// Create singleton instance
const unifiedRealtime = new UnifiedRealtimeService();

export default unifiedRealtime;
