import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        });
      },
    },
  }
);

export async function GET(request) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get manual entries stats
    const [
      { count: totalCount },
      { count: pendingCount },
      { count: approvedCount },
      { count: rejectedCount }
    ] = await Promise.all([
      supabaseAdmin
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('is_manual_entry', true),
      supabaseAdmin
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('is_manual_entry', true)
        .eq('status', 'pending'),
      supabaseAdmin
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('is_manual_entry', true)
        .eq('status', 'completed'),
      supabaseAdmin
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('is_manual_entry', true)
        .eq('status', 'rejected')
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        total: totalCount || 0,
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0,
      }
    });

  } catch (error) {
    console.error('Manual entries stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}