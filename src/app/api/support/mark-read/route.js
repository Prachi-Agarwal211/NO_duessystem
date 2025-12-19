import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/support/mark-read
 * Marks a support ticket as read (admin only)
 * Body: { ticketId: 'uuid' }
 */
export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get ticket ID from request body
    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'Ticket ID required' },
        { status: 400 }
      );
    }

    // Mark ticket as read
    const { data, error: updateError } = await supabase
      .from('support_tickets')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: session.user.id
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (updateError) {
      console.error('Mark as read error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to mark ticket as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Mark as read route error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}