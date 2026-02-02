import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// This is server-side admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: "Missing form ID" }, { status: 400 });
  }

  const cookieStore = cookies();

  // Create server client with your library version
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

  // 1. Check if a user is logged in
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Check if logged-in user is an admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
  }

  // 3. Fetch individual application details using admin client
  try {
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status (
          id,
          department_name,
          status,
          action_at,
          action_by,
          remarks,
          rejection_reason,
          student_reply_message,
          unread_count,
          created_at,
          updated_at,
          profiles (
            full_name
          )
        )
      `)
      .eq('id', id)
      .single();

    if (applicationError) {
      throw applicationError;
    }

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: application });

  } catch (err) {
    console.error('Error fetching application details:', err);
    return NextResponse.json({ error: err.message || "Failed to fetch application details." }, { status: 500 });
  }
}
