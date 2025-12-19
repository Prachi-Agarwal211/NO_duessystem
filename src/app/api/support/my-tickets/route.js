import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

  // Get user's profile to determine their role and email
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", session.user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 20;
  const offset = (page - 1) * limit;

  try {
    // Build query - filter by user's email and requester type
    let query = supabase
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .eq('user_email', profile.email);

    // Filter by requester type based on role
    if (profile.role === 'student') {
      query = query.eq('requester_type', 'student');
    } else if (profile.role === 'staff' || profile.role === 'hod') {
      query = query.eq('requester_type', 'department');
    } else {
      // For other roles, don't filter by requester type
      // (they can see both if they submitted with either type)
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

    // Get user's ticket statistics
    let statsQuery = supabase
      .from('support_tickets')
      .select('status, requester_type')
      .eq('user_email', profile.email);

    if (profile.role === 'student') {
      statsQuery = statsQuery.eq('requester_type', 'student');
    } else if (profile.role === 'staff' || profile.role === 'hod') {
      statsQuery = statsQuery.eq('requester_type', 'department');
    }

    const { data: allUserTickets } = await statsQuery;

    const stats = {
      total_tickets: allUserTickets?.length || 0,
      open_tickets: allUserTickets?.filter(t => t.status === 'open').length || 0,
      in_progress_tickets: allUserTickets?.filter(t => t.status === 'in_progress').length || 0,
      resolved_tickets: allUserTickets?.filter(t => t.status === 'resolved').length || 0,
      closed_tickets: allUserTickets?.filter(t => t.status === 'closed').length || 0,
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
      stats,
      userType: profile.role === 'student' ? 'student' : 'department'
    });

  } catch (error) {
    console.error('Error fetching user support tickets:', error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}