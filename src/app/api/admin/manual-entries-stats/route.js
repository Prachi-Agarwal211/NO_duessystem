import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

    // ⚡ PERFORMANCE: Use database function for efficient stats calculation
    const { data: manualStats, error: statsError } = await supabaseAdmin
      .rpc('get_manual_entry_statistics');

    if (statsError) {
      console.error('Manual entry stats error:', statsError);
      throw statsError;
    }

    // Extract stats from function result
    const stats = manualStats && manualStats.length > 0 ? manualStats[0] : {
      total_entries: 0,
      pending_entries: 0,
      approved_entries: 0,
      rejected_entries: 0
    };

    return NextResponse.json({
      success: true,
      stats: {
        total: Number(stats.total_entries) || 0,
        pending: Number(stats.pending_entries) || 0,
        approved: Number(stats.approved_entries) || 0,
        rejected: Number(stats.rejected_entries) || 0,
      }
    });

  } catch (error) {
    console.error('Manual entries stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}