import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/support/unread-count
 * Returns count of unread support tickets (admin only)
 */
export async function GET(request) {
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

    // Get unread count (not read AND not resolved)
    const { count, error: countError } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('status', 'resolved');

    if (countError) {
      console.error('Unread count error:', countError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch unread count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      unreadCount: count || 0
    });

  } catch (error) {
    console.error('Unread count route error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}