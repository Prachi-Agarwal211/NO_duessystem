/**
 * Enhanced Real-time Service
 * 
 * Fixes all real-time functionality including:
 * - WebSocket connection management
 * - Event broadcasting and subscription
 * - Chat system real-time updates
 * - Status change notifications
 * - Support ticket updates
 * - Department action notifications
 */

import { supabase } from '@/lib/supabaseClient';

class RealtimeService {
  constructor() {
    this.channels = new Map();
    this.subscribers = new Map();
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // Event types for different features
    this.eventTypes = {
      CHAT_MESSAGE: 'chat_message',
      STATUS_UPDATE: 'status_update', 
      FORM_SUBMISSION: 'form_submission',
      DEPARTMENT_ACTION: 'department_action',
      SUPPORT_TICKET: 'support_ticket',
      CERTIFICATE_GENERATED: 'certificate_generated',
      REAPPLICATION: 'reapplication'
    };
  }

  /**
   * Initialize real-time service
   */
  async initialize() {
    try {
      // Test connection
      const { data, error } = await supabase
        .from('no_dues_forms')
        .select('id')
        .limit(1);

      if (error) throw error;

      this.connectionStatus = 'connected';
      console.log('✅ Real-time service initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize real-time service:', error);
      this.connectionStatus = 'error';
      return false;
    }
  }

  /**
   * Subscribe to form-specific updates
   */
  subscribeToForm(formId, callbacks = {}) {
    const channelName = `form_${formId}`;
    
    // Clean up existing subscription
    if (this.channels.has(channelName)) {
      this.channels.get(channelName).unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'no_dues_status',
          filter: `form_id=eq.${formId}` 
        },
        (payload) => this.handleStatusUpdate(payload, callbacks.onStatusUpdate)
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'no_dues_messages', 
          filter: `form_id=eq.${formId}`
        },
        (payload) => this.handleChatMessage(payload, callbacks.onChatMessage)
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'no_dues_forms',
          filter: `id=eq.${formId}`
        },
        (payload) => this.handleFormUpdate(payload, callbacks.onFormUpdate)
      )
      .subscribe((status) => {
        console.log(`📡 Form ${formId} subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          this.connectionStatus = 'connected';
        } else if (status === 'CHANNEL_ERROR') {
          this.handleConnectionError(channelName);
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to department updates
   */
  subscribeToDepartment(departmentName, callbacks = {}) {
    const channelName = `dept_${departmentName}`;
    
    if (this.channels.has(channelName)) {
      this.channels.get(channelName).unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'no_dues_messages',
          filter: `department_name=eq.${departmentName}`
        },
        (payload) => this.handleDepartmentMessage(payload, callbacks.onMessage)
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'no_dues_status',
          filter: `department_name=eq.${departmentName}`
        },
        (payload) => this.handleDepartmentStatusUpdate(payload, callbacks.onStatusUpdate)
      )
      .subscribe((status) => {
        console.log(`📡 Department ${departmentName} subscription status:`, status);
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to admin dashboard updates
   */
  subscribeToAdminDashboard(callbacks = {}) {
    const channelName = 'admin_dashboard';
    
    if (this.channels.has(channelName)) {
      this.channels.get(channelName).unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'no_dues_forms'
        },
        (payload) => this.handleNewFormSubmission(payload, callbacks.onNewForm)
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'no_dues_forms'
        },
        (payload) => this.handleFormStatusChange(payload, callbacks.onFormStatusChange)
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => this.handleSupportTicketUpdate(payload, callbacks.onSupportTicket)
      )
      .subscribe((status) => {
        console.log('📡 Admin dashboard subscription status:', status);
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to support ticket updates
   */
  subscribeToSupportTickets(userEmail, callbacks = {}) {
    const channelName = `support_${userEmail}`;
    
    if (this.channels.has(channelName)) {
      this.channels.get(channelName).unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_email=eq.${userEmail}`
        },
        (payload) => this.handleSupportTicketUpdate(payload, callbacks.onTicketUpdate)
      )
      .subscribe((status) => {
        console.log(`📡 Support tickets subscription status:`, status);
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Handle status updates
   */
  handleStatusUpdate(payload, callback) {
    console.log('🔄 Status update:', payload);
    
    const event = {
      type: this.eventTypes.STATUS_UPDATE,
      data: payload.new,
      oldData: payload.old,
      eventType: payload.eventType,
      timestamp: new Date().toISOString()
    };

    // Trigger callback if provided
    if (callback) callback(event);

    // Broadcast to global subscribers
    this.broadcastEvent(event);
  }

  /**
   * Handle chat messages
   */
  handleChatMessage(payload, callback) {
    console.log('💬 Chat message:', payload);
    
    const event = {
      type: this.eventTypes.CHAT_MESSAGE,
      data: payload.new,
      oldData: payload.old,
      eventType: payload.eventType,
      timestamp: new Date().toISOString()
    };

    if (callback) callback(event);
    this.broadcastEvent(event);
  }

  /**
   * Handle form updates
   */
  handleFormUpdate(payload, callback) {
    console.log('📄 Form update:', payload);
    
    const event = {
      type: this.eventTypes.FORM_SUBMISSION,
      data: payload.new,
      oldData: payload.old,
      eventType: payload.eventType,
      timestamp: new Date().toISOString()
    };

    if (callback) callback(event);
    this.broadcastEvent(event);
  }

  /**
   * Handle department messages
   */
  handleDepartmentMessage(payload, callback) {
    console.log('🏢 Department message:', payload);
    
    const event = {
      type: this.eventTypes.CHAT_MESSAGE,
      data: payload.new,
      oldData: payload.old,
      eventType: payload.eventType,
      timestamp: new Date().toISOString()
    };

    if (callback) callback(event);
    this.broadcastEvent(event);
  }

  /**
   * Handle department status updates
   */
  handleDepartmentStatusUpdate(payload, callback) {
    console.log('🏢 Department status update:', payload);
    
    const event = {
      type: this.eventTypes.DEPARTMENT_ACTION,
      data: payload.new,
      oldData: payload.old,
      eventType: payload.eventType,
      timestamp: new Date().toISOString()
    };

    if (callback) callback(event);
    this.broadcastEvent(event);
  }

  /**
   * Handle new form submissions
   */
  handleNewFormSubmission(payload, callback) {
    console.log('📝 New form submission:', payload);
    
    const event = {
      type: this.eventTypes.FORM_SUBMISSION,
      data: payload.new,
      eventType: 'INSERT',
      timestamp: new Date().toISOString()
    };

    if (callback) callback(event);
    this.broadcastEvent(event);
  }

  /**
   * Handle form status changes
   */
  handleFormStatusChange(payload, callback) {
    console.log('🔄 Form status change:', payload);
    
    const event = {
      type: this.eventTypes.STATUS_UPDATE,
      data: payload.new,
      oldData: payload.old,
      eventType: payload.eventType,
      timestamp: new Date().toISOString()
    };

    if (callback) callback(event);
    this.broadcastEvent(event);
  }

  /**
   * Handle support ticket updates
   */
  handleSupportTicketUpdate(payload, callback) {
    console.log('🎫 Support ticket update:', payload);
    
    const event = {
      type: this.eventTypes.SUPPORT_TICKET,
      data: payload.new,
      oldData: payload.old,
      eventType: payload.eventType,
      timestamp: new Date().toISOString()
    };

    if (callback) callback(event);
    this.broadcastEvent(event);
  }

  /**
   * Broadcast event to all subscribers
   */
  broadcastEvent(event) {
    const subscribers = this.subscribers.get(event.type) || [];
    subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Subscribe to specific event type
   */
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(eventType);
      if (subscribers) {
        subscribers.delete(callback);
      }
    };
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channelName) {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
      console.log(`📡 Unsubscribed from ${channelName}`);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    this.channels.forEach((channel, name) => {
      channel.unsubscribe();
    });
    this.channels.clear();
    this.subscribers.clear();
    console.log('📡 Unsubscribed from all channels');
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(channelName) {
    console.error(`❌ Connection error on ${channelName}`);
    this.connectionStatus = 'error';
    
    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}`);
        // Re-initialize the specific subscription
        this.reconnectChannel(channelName);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  /**
   * Reconnect specific channel
   */
  async reconnectChannel(channelName) {
    console.log(`🔄 Reconnecting to ${channelName}`);
    
    try {
      // Check if we have subscription info for this channel
      const subscriptionInfo = this.channelSubscriptions.get(channelName);
      if (!subscriptionInfo) {
        console.error(`❌ No subscription info found for channel: ${channelName}`);
        return false;
      }
      
      // Clean up existing channel
      if (this.channels.has(channelName)) {
        const existingChannel = this.channels.get(channelName);
        supabase.removeChannel(existingChannel);
        this.channels.delete(channelName);
      }
      
      // Create new channel with same configuration
      const newChannel = supabase.channel(channelName);
      
      // Re-attach all event listeners based on subscription type
      if (subscriptionInfo.type === 'form') {
        newChannel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'no_dues_status',
          filter: `form_id=eq.${subscriptionInfo.formId}`
        }, (payload) => this.handleStatusUpdate(payload, subscriptionInfo.callbacks.onStatusUpdate));
        
        newChannel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'no_dues_messages',
          filter: `form_id=eq.${subscriptionInfo.formId}`
        }, (payload) => this.handleChatMessage(payload, subscriptionInfo.callbacks.onChatMessage));
        
        newChannel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'no_dues_forms',
          filter: `id=eq.${subscriptionInfo.formId}`
        }, (payload) => this.handleFormUpdate(payload, subscriptionInfo.callbacks.onFormUpdate));
      }
      
      // Subscribe to the new channel
      const subscription = await newChannel.subscribe();
      
      if (subscription === 'SUBSCRIBED') {
        console.log(`✅ Successfully reconnected to ${channelName}`);
        
        // Store new channel and subscription info
        this.channels.set(channelName, newChannel);
        this.channelSubscriptions.set(channelName, subscriptionInfo);
        
        // Reset reconnection attempts
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        
        return true;
      } else {
        console.error(`❌ Failed to reconnect to ${channelName}`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Error reconnecting to ${channelName}:`, error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      channels: Array.from(this.channels.keys()),
      subscribers: Object.fromEntries(
        Array.from(this.subscribers.entries()).map(([type, subs]) => [type, subs.size])
      )
    };
  }

  /**
   * Send real-time notification
   */
  async sendNotification(type, data, recipients = []) {
    try {
      // This could integrate with a notification system
      console.log('📢 Sending notification:', { type, data, recipients });
      
      // Broadcast to relevant subscribers
      this.broadcastEvent({
        type,
        data,
        timestamp: new Date().toISOString(),
        recipients
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return false;
    }
  }
}

// Create singleton instance
const realtimeService = new RealtimeService();

export default realtimeService;
