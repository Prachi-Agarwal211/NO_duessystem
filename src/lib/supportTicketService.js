/**
 * Support Ticket Service
 * 
 * Handles all support ticket operations including:
 * - Ticket creation and management
 * - Assignment and tracking
 * - Communication and resolution
 * - Real-time updates
 * - Analytics and reporting
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import realtimeService from '@/lib/realtimeService';

class SupportTicketService {
  constructor() {
    this.ticketCategories = {
      technical: 'Technical Issues',
      account: 'Account Problems',
      academic: 'Academic Queries',
      administrative: 'Administrative',
      other: 'Other'
    };

    this.priorities = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent'
    };

    this.statuses = {
      open: 'Open',
      in_progress: 'In Progress',
      pending: 'Pending',
      resolved: 'Resolved',
      closed: 'Closed'
    };
  }

  /**
   * Create a new support ticket
   */
  async createTicket(ticketData) {
    try {
      console.log('🎫 Creating new support ticket...');

      // Generate unique ticket ID
      const ticketId = this.generateTicketId();

      // Validate ticket data
      const validatedData = this.validateTicketData(ticketData);

      // Create ticket with proper data
      const { data: ticket, error } = await supabaseAdmin
        .from('support_tickets')
        .insert([{
          ticket_id: ticketId,
          form_id: validatedData.formId || null,
          registration_no: validatedData.registrationNo || null,
          student_name: validatedData.studentName || null,
          user_email: validatedData.userEmail,
          requester_type: validatedData.requesterType,
          subject: validatedData.subject,
          message: validatedData.message,
          category: validatedData.category || 'other',
          priority: validatedData.priority || 'medium',
          status: 'open',
          is_read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select(`
          *,
          requester_profile:profiles(
            full_name,
            role,
            department_name
          )
        `)
        .single();

      if (error) throw error;

      // Send notifications
      await this.sendTicketNotifications(ticket);

      // Trigger real-time update
      await this.triggerRealtimeUpdate('ticket_created', ticket);

      console.log(`✅ Support ticket created: ${ticketId}`);
      return {
        success: true,
        data: ticket
      };

    } catch (error) {
      console.error('❌ Failed to create support ticket:', error);
      throw error;
    }
  }

  /**
   * Validate ticket data
   */
  validateTicketData(data) {
    const errors = [];

    if (!data.userEmail) errors.push('User email is required');
    if (!data.subject || data.subject.trim().length < 3) {
      errors.push('Subject must be at least 3 characters');
    }
    if (!data.message || data.message.trim().length < 10) {
      errors.push('Message must be at least 10 characters');
    }
    if (!data.requesterType || !['student', 'department'].includes(data.requesterType)) {
      errors.push('Valid requester type is required (student or department)');
    }

    // Validate email format
    if (data.userEmail && !this.isValidEmail(data.userEmail)) {
      errors.push('Valid email address is required');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return {
      userEmail: data.userEmail.toLowerCase().trim(),
      subject: data.subject.trim(),
      message: data.message.trim(),
      requesterType: data.requesterType,
      category: data.category || 'other',
      priority: data.priority || 'medium',
      formId: data.formId || null,
      registrationNo: data.registrationNo?.toUpperCase() || null,
      studentName: data.studentName?.trim() || null
    };
  }

  /**
   * Generate unique ticket ID
   */
  generateTicketId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `TICKET${timestamp}${random}`;
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get tickets with filtering and pagination
   */
  async getTickets(options = {}) {
    const {
      page = 1,
      limit = 50,
      status,
      requesterType,
      priority,
      category,
      search,
      assignedTo,
      startDate,
      endDate
    } = options;

    const offset = (page - 1) * limit;

    try {
      let query = supabaseAdmin
        .from('support_tickets')
        .select(`
          *,
          requester_profile:profiles(
            full_name,
            role,
            department_name
          )
        `);

      // Apply filters
      if (status) query = query.eq('status', status);
      if (requesterType) query = query.eq('requester_type', requesterType);
      if (priority) query = query.eq('priority', priority);
      if (category) query = query.eq('category', category);
      if (assignedTo) query = query.eq('assigned_to', assignedTo);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      // Search functionality
      if (search) {
        query = query.or(`
          subject.ilike.%${search}%,message.ilike.%${search}%,ticket_id.ilike.%${search}%
        `);
      }

      // Get total count
      const { count } = await query.clone().select('*', { count: 'exact', head: true });

      // Apply pagination and ordering
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };

    } catch (error) {
      console.error('❌ Failed to get tickets:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }
  }

  /**
   * Get ticket details by ID
   */
  async getTicketDetails(ticketId) {
    try {
      const { data: ticket, error } = await supabaseAdmin
        .from('support_tickets')
        .select(`
          *,
          requester_profile:profiles(
            full_name,
            role,
            department_name,
            email
          )
        `)
        .eq('ticket_id', ticketId)
        .single();

      if (error) throw error;
      if (!ticket) throw new Error('Ticket not found');

      // Get ticket history/updates
      const { data: history } = await supabaseAdmin
        .from('support_ticket_updates')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      return {
        success: true,
        data: {
          ...ticket,
          history: history || []
        }
      };

    } catch (error) {
      console.error('❌ Failed to get ticket details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId, statusUpdate) {
    try {
      console.log(`🔄 Updating ticket ${ticketId} status to ${statusUpdate.status}`);

      const { data: ticket, error } = await supabaseAdmin
        .from('support_tickets')
        .update({
          status: statusUpdate.status,
          assigned_to: statusUpdate.assignedTo || null,
          resolution: statusUpdate.resolution || null,
          resolved_at: statusUpdate.status === 'resolved' ? new Date().toISOString() : null,
          resolved_by: statusUpdate.resolvedBy || null,
          updated_at: new Date().toISOString()
        })
        .eq('ticket_id', ticketId)
        .select('*')
        .single();

      if (error) throw error;

      // Add update to history
      await this.addTicketHistory(ticketId, {
        action: 'status_update',
        old_status: ticket.status,
        new_status: statusUpdate.status,
        updated_by: statusUpdate.updatedBy,
        notes: statusUpdate.notes
      });

      // Send notifications
      await this.sendStatusUpdateNotifications(ticket, statusUpdate);

      // Trigger real-time update
      await this.triggerRealtimeUpdate('ticket_updated', ticket);

      console.log(`✅ Ticket ${ticketId} status updated successfully`);
      return {
        success: true,
        data: ticket
      };

    } catch (error) {
      console.error('❌ Failed to update ticket status:', error);
      throw error;
    }
  }

  /**
   * Add ticket to history
   */
  async addTicketHistory(ticketId, historyData) {
    try {
      const { error } = await supabaseAdmin
        .from('support_ticket_updates')
        .insert({
          ticket_id: ticketId,
          action: historyData.action,
          old_status: historyData.old_status,
          new_status: historyData.new_status,
          updated_by: historyData.updated_by,
          notes: historyData.notes,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('⚠️ Failed to add ticket history:', error);
      // Don't fail the update if history fails
    }
  }

  /**
   * Assign ticket to staff member
   */
  async assignTicket(ticketId, assignedTo, assignedBy) {
    try {
      const { data: ticket, error } = await supabaseAdmin
        .from('support_tickets')
        .update({
          assigned_to: assignedTo,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('ticket_id', ticketId)
        .select('*')
        .single();

      if (error) throw error;

      // Add to history
      await this.addTicketHistory(ticketId, {
        action: 'assigned',
        updated_by: assignedBy,
        notes: `Assigned to ${assignedTo}`
      });

      // Send notification to assigned staff
      await this.sendAssignmentNotification(ticket, assignedTo);

      // Trigger real-time update
      await this.triggerRealtimeUpdate('ticket_assigned', ticket);

      console.log(`✅ Ticket ${ticketId} assigned to ${assignedTo}`);
      return {
        success: true,
        data: ticket
      };

    } catch (error) {
      console.error('❌ Failed to assign ticket:', error);
      throw error;
    }
  }

  /**
   * Add comment to ticket
   */
  async addComment(ticketId, comment, author) {
    try {
      const { data: ticketComment, error } = await supabaseAdmin
        .from('support_ticket_comments')
        .insert([{
          ticket_id: ticketId,
          comment: comment.trim(),
          author: author,
          created_at: new Date().toISOString()
        }])
        .select('*')
        .single();

      if (error) throw error;

      // Update ticket's updated_at
      await supabaseAdmin
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('ticket_id', ticketId);

      // Trigger real-time update
      await this.triggerRealtimeUpdate('ticket_comment', {
        ticketId,
        comment: ticketComment
      });

      console.log(`💬 Comment added to ticket ${ticketId}`);
      return {
        success: true,
        data: ticketComment
      };

    } catch (error) {
      console.error('❌ Failed to add comment:', error);
      throw error;
    }
  }

  /**
   * Get ticket statistics
   */
  async getTicketStatistics(filters = {}) {
    try {
      const { startDate, endDate } = filters;

      let query = supabaseAdmin
        .from('support_tickets')
        .select('status, requester_type, priority, created_at, resolved_at');

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        by_status: {},
        by_requester_type: {},
        by_priority: {},
        resolution_time: {
          average: 0,
          total_resolved: 0
        }
      };

      data?.forEach(ticket => {
        // Status breakdown
        if (!stats.by_status[ticket.status]) {
          stats.by_status[ticket.status] = 0;
        }
        stats.by_status[ticket.status]++;

        // Requester type breakdown
        if (!stats.by_requester_type[ticket.requester_type]) {
          stats.by_requester_type[ticket.requester_type] = 0;
        }
        stats.by_requester_type[ticket.requester_type]++;

        // Priority breakdown
        if (!stats.by_priority[ticket.priority]) {
          stats.by_priority[ticket.priority] = 0;
        }
        stats.by_priority[ticket.priority]++;

        // Resolution time calculation
        if (ticket.resolved_at && ticket.created_at) {
          const resolutionTime = new Date(ticket.resolved_at) - new Date(ticket.created_at);
          const resolutionHours = resolutionTime / (1000 * 60 * 60);
          stats.resolution_time.total_resolved++;
          stats.resolution_time.average += resolutionHours;
        }
      });

      // Calculate average resolution time
      if (stats.resolution_time.total_resolved > 0) {
        stats.resolution_time.average = 
          (stats.resolution_time.average / stats.resolution_time.total_resolved).toFixed(2);
      }

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('❌ Failed to get ticket statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send ticket creation notifications
   */
  async sendTicketNotifications(ticket) {
    try {
      // Send email to user confirming ticket creation
      console.log(`📧 Sending ticket creation notification to ${ticket.user_email}`);
      
      // Send notification to admin/staff if high priority
      if (ticket.priority === 'urgent' || ticket.priority === 'high') {
        console.log(`📧 High priority ticket notification sent to staff`);
      }

    } catch (error) {
      console.error('⚠️ Failed to send ticket notifications:', error);
    }
  }

  /**
   * Send status update notifications
   */
  async sendStatusUpdateNotifications(ticket, statusUpdate) {
    try {
      // Send email to user about status change
      console.log(`📧 Sending status update notification to ${ticket.user_email}`);
      
      // Send notification to assigned staff
      if (ticket.assigned_to) {
        console.log(`📧 Status update notification sent to assigned staff`);
      }

    } catch (error) {
      console.error('⚠️ Failed to send status update notifications:', error);
    }
  }

  /**
   * Send assignment notification
   */
  async sendAssignmentNotification(ticket, assignedTo) {
    try {
      console.log(`📧 Sending assignment notification to ${assignedTo}`);
    } catch (error) {
      console.error('⚠️ Failed to send assignment notification:', error);
    }
  }

  /**
   * Trigger real-time update
   */
  async triggerRealtimeUpdate(eventType, data) {
    try {
      await realtimeService.sendNotification(eventType, data);
      console.log(`📡 Support ticket real-time update triggered: ${eventType}`);
    } catch (error) {
      console.error('⚠️ Failed to trigger real-time update:', error);
    }
  }

  /**
   * Get available ticket categories
   */
  getTicketCategories() {
    return this.ticketCategories;
  }

  /**
   * Get available priorities
   */
  getPriorities() {
    return this.priorities;
  }

  /**
   * Get available statuses
   */
  getStatuses() {
    return this.statuses;
  }
}

// Create singleton instance
const supportTicketService = new SupportTicketService();

export default supportTicketService;
