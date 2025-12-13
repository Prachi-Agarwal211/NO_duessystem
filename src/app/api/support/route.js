import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const cookieStore = cookies();

  // Create server client for authentication
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set(name, value, options);
        },
        remove(name, options) {
          cookieStore.delete(name, options);
        },
      },
    }
  );

  // Check authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const requesterType = searchParams.get('requester_type');
  const priority = searchParams.get('priority');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 50;
  const offset = (page - 1) * limit;

  try {
    // Build query
    let query = supabaseAdmin
      .from('support_tickets')
      .select('*', { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (requesterType) {
      query = query.eq('requester_type', requesterType);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,roll_number.ilike.%${search}%,ticket_number.ilike.%${search}%,message.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: tickets, error: ticketsError, count } = await query;

    if (ticketsError) {
      throw ticketsError;
    }

    // Get statistics
    const { data: statsData } = await supabaseAdmin
      .from('support_tickets_stats')
      .select('*')
      .single();

    return NextResponse.json({
      success: true,
      tickets: tickets || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats: statsData || {
        total_tickets: 0,
        open_tickets: 0,
        in_progress_tickets: 0,
        resolved_tickets: 0,
        closed_tickets: 0,
        student_tickets: 0,
        department_tickets: 0,
        urgent_tickets: 0,
        high_priority_tickets: 0,
        avg_resolution_time_hours: 0
      }
    });

  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}

// UPDATE ticket (admin only)
export async function PATCH(request) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set(name, value, options);
        },
        remove(name, options) {
          cookieStore.delete(name, options);
        },
      },
    }
  );

  // Check authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { ticketId, status, priority, adminNotes } = body;

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
      // If resolved or closed, set resolved_at and resolved_by
      if ((status === 'resolved' || status === 'closed')) {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = session.user.id;
      }
    }

    if (priority) {
      updateData.priority = priority;
    }

    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }

    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket: data
    });

  } catch (error) {
    console.error('Error updating support ticket:', error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update ticket" },
      { status: 500 }
    );
  }
}