import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
 * POST /api/support/mark-read
 * Marks a support ticket as read (admin only)
 * Body: { ticketId: 'uuid' }
 */
export async function POST(request) {
  try {
    // ✅ FIX: Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    // ✅ FIX: Validate token using service role client
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin - query by EMAIL first (handles ID mismatches)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('email', user.email.toLowerCase())
      .single();

    // Fallback to ID lookup if email lookup fails
    if (profileError && profileError.code === 'PGRST116') {
      const { data: profileById } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileById?.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }
    } else if (profile?.role !== 'admin') {
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
    const { data, error: updateError } = await supabaseAdmin
      .from('support_tickets')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: user.id
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