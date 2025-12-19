import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// GET - Admin view all tickets (filtered by requester_type)
export async function GET(request) {
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

  // Get user's profile to verify admin role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const requesterType = searchParams.get('requester_type'); // 'student' or 'department'
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 50;
  const offset = (page - 1) * limit;

  try {
    // Build query
    let query = supabase
      .from('support_tickets')
      .select('*', { count: 'exact' });

    // Filter by requester type (required for admin view)
    if (requesterType) {
      query = query.eq('requester_type', requesterType);
    }

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: tickets, error: ticketsError, count } = await query;

    if (ticketsError) {
      throw ticketsError;
    }

    // Get statistics for both types
    const { data: allTickets } = await supabase
      .from('support_tickets')
      .select('status, requester_type');

    const stats = {
      student_total: allTickets?.filter(t => t.requester_type === 'student').length || 0,
      student_open: allTickets?.filter(t => t.requester_type === 'student' && t.status === 'open').length || 0,
      department_total: allTickets?.filter(t => t.requester_type === 'department').length || 0,
      department_open: allTickets?.filter(t => t.requester_type === 'department' && t.status === 'open').length || 0,
    };

    return NextResponse.json({
      success: true,
      tickets: tickets || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}

// PATCH - Admin update ticket status
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

  // Get user's profile to verify admin role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", session.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { ticketId, status } = body;

    if (!ticketId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing ticketId or status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Update ticket status
    const { data: updatedTicket, error: updateError } = await supabase
      .from('support_tickets')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'resolved' && { resolved_at: new Date().toISOString(), resolved_by: profile.email }),
        ...(status === 'closed' && { resolved_at: new Date().toISOString(), resolved_by: profile.email })
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket status updated successfully'
    });

  } catch (error) {
    console.error('Error updating ticket status:', error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update ticket status" },
      { status: 500 }
    );
  }
}