import { createClient } from '@supabase/supabase-js';
import { NextResponse } from "next/server";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Create Supabase admin client with service role
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            persistSession: false,
        }
    }
);

/**
 * PATCH - Department staff respond to support ticket
 * Allows department staff to update ticket status and add responses
 */
export async function PATCH(request) {
    try {
        // Extract and validate authorization token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized - No token provided" }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 });
        }

        // Get user's profile to verify department staff role
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("id, role, full_name, email, assigned_department_ids")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Department staff can respond to tickets
        const isAdmin = profile.role === 'admin';
        const isStaff = profile.role === 'staff' || profile.role === 'department';

        if (!isAdmin && !isStaff) {
            return NextResponse.json({ error: "Forbidden - Staff access required" }, { status: 403 });
        }

        // Parse request body
        const body = await request.json();
        const { ticketId, status, response, departmentName } = body;

        if (!ticketId) {
            return NextResponse.json(
                { success: false, error: 'Missing ticketId' },
                { status: 400 }
            );
        }

        // Get the ticket first
        const { data: ticket, error: ticketError } = await supabaseAdmin
            .from('support_tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (ticketError || !ticket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        // If department staff, verify they can respond to this ticket
        if (!isAdmin && departmentName) {
            // Department staff can only respond to tickets from their department
            if (ticket.requester_type === 'department' && ticket.requester_department !== departmentName) {
                return NextResponse.json({ error: "Not authorized for this ticket" }, { status: 403 });
            }
        }

        // Validate status if provided
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json(
                { success: false, error: 'Invalid status value' },
                { status: 400 }
            );
        }

        // Build update object
        const updateData = {
            updated_at: new Date().toISOString(),
        };

        // Update status if provided
        if (status) {
            updateData.status = status;

            // Add resolved info if resolving or closing
            if (status === 'resolved' || status === 'closed') {
                updateData.resolved_at = new Date().toISOString();
                updateData.resolved_by = profile.full_name || profile.email;
            }
        }

        // Add response if provided
        if (response) {
            // Store response as admin_response for compatibility
            // Could also append to a responses array if needed
            const existingResponse = ticket.admin_response || '';
            const responsePrefix = `[${profile.full_name || profile.email}] ${new Date().toISOString()}:\n`;
            updateData.admin_response = existingResponse + '\n' + responsePrefix + response;
            updateData.responded_at = new Date().toISOString();
            updateData.responded_by = user.id;
        }

        // Update ticket
        const { data: updatedTicket, error: updateError } = await supabaseAdmin
            .from('support_tickets')
            .update(updateData)
            .eq('id', ticketId)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        // Send email notification if response or status change
        if ((response || status) && updatedTicket.user_email) {
            try {
                const { sendSupportTicketResponse } = await import('@/lib/emailService');
                await sendSupportTicketResponse({
                    userEmail: updatedTicket.user_email,
                    ticketNumber: updatedTicket.ticket_number,
                    subject: updatedTicket.subject,
                    adminResponse: response || null,
                    status: status || updatedTicket.status,
                    resolvedBy: profile.full_name || profile.email
                });
                console.log(`📧 Support ticket response email sent to ${updatedTicket.user_email}`);
            } catch (emailError) {
                console.error('Failed to send support email:', emailError);
            }
        }

        return NextResponse.json({
            success: true,
            ticket: updatedTicket,
            message: 'Ticket updated successfully'
        });

    } catch (error) {
        console.error('Error updating support ticket:', error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to update ticket" },
            { status: 500 }
        );
    }
}
