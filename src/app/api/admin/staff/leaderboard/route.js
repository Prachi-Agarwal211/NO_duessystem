export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: { persistSession: false },
        global: {
            fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
        }
    }
);

// Helper: Verify admin user
async function verifyAdmin(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
        return { error: 'No authorization header', status: 401 };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
        return { error: 'Invalid token', status: 401 };
    }

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        return { error: 'Unauthorized: Admin access required', status: 403 };
    }

    return { userId: user.id };
}

/**
 * GET /api/admin/staff/leaderboard
 * Get staff rankings by various metrics
 */
export async function GET(request) {
    try {
        const adminCheck = await verifyAdmin(request);
        if (adminCheck.error) {
            return NextResponse.json(
                { success: false, error: adminCheck.error },
                { status: adminCheck.status }
            );
        }

        const { searchParams } = new URL(request.url);
        const sortBy = searchParams.get('sortBy') || 'total_actions';
        const limit = parseInt(searchParams.get('limit')) || 10;
        const period = searchParams.get('period') || 'all'; // all, month, week

        // Try RPC first
        const { data: rpcData, error: rpcError } = await supabaseAdmin
            .rpc('get_staff_leaderboard', {
                p_sort_by: sortBy,
                p_limit: limit
            });

        if (!rpcError && rpcData && rpcData.length > 0) {
            return NextResponse.json({
                success: true,
                data: {
                    leaderboard: rpcData,
                    sortBy,
                    period,
                    generatedAt: new Date().toISOString()
                }
            });
        }

        // Fallback: Direct query with aggregation
        console.log('RPC failed, using fallback query. Error:', rpcError);

        // Get all department staff with their action counts
        const { data: staffActions, error: staffError } = await supabaseAdmin
            .from('no_dues_status')
            .select(`
        action_by_user_id,
        status,
        action_at,
        created_at
      `)
            .not('action_by_user_id', 'is', null)
            .not('action_at', 'is', null);

        if (staffError) throw staffError;

        // Get all staff profiles
        const { data: staffProfiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select(`
        id,
        full_name,
        email,
        department_name,
        avatar_url,
        is_active
      `)
            .eq('role', 'department')
            .eq('is_active', true);

        if (profileError) throw profileError;

        // Get department display names
        const { data: departments } = await supabaseAdmin
            .from('departments')
            .select('name, display_name');

        const deptMap = {};
        departments?.forEach(d => { deptMap[d.name] = d.display_name; });

        // Aggregate stats per staff
        const statsMap = {};
        staffActions?.forEach(action => {
            const id = action.action_by_user_id;
            if (!statsMap[id]) {
                statsMap[id] = {
                    total_actions: 0,
                    approved: 0,
                    rejected: 0,
                    response_times: [],
                    action_dates: new Set()
                };
            }
            statsMap[id].total_actions++;
            if (action.status === 'approved') statsMap[id].approved++;
            if (action.status === 'rejected') statsMap[id].rejected++;

            // Calculate response time
            if (action.action_at && action.created_at) {
                const responseHours = (new Date(action.action_at) - new Date(action.created_at)) / (1000 * 60 * 60);
                statsMap[id].response_times.push(responseHours);
            }

            // Track active days
            if (action.action_at) {
                statsMap[id].action_dates.add(new Date(action.action_at).toDateString());
            }
        });

        // Build leaderboard
        let leaderboard = staffProfiles?.map(staff => {
            const stats = statsMap[staff.id] || {
                total_actions: 0,
                approved: 0,
                rejected: 0,
                response_times: [],
                action_dates: new Set()
            };

            const avgResponse = stats.response_times.length > 0
                ? stats.response_times.reduce((a, b) => a + b, 0) / stats.response_times.length
                : null;

            const slaCompliant = stats.response_times.filter(t => t < 48).length;
            const slaRate = stats.response_times.length > 0
                ? Math.round((slaCompliant / stats.response_times.length) * 100 * 100) / 100
                : null;

            return {
                staff_id: staff.id,
                full_name: staff.full_name,
                department_name: staff.department_name,
                department_display: deptMap[staff.department_name] || staff.department_name,
                avatar_url: staff.avatar_url,
                total_actions: stats.total_actions,
                approval_rate: stats.total_actions > 0
                    ? Math.round((stats.approved / stats.total_actions) * 100 * 100) / 100
                    : 0,
                avg_response_hours: avgResponse ? Math.round(avgResponse * 100) / 100 : null,
                sla_compliance_rate: slaRate,
                active_days: stats.action_dates.size
            };
        }).filter(s => s.total_actions > 0) || [];

        // Sort based on criteria
        switch (sortBy) {
            case 'approval_rate':
                leaderboard.sort((a, b) => (b.approval_rate || 0) - (a.approval_rate || 0));
                break;
            case 'avg_response_hours':
                leaderboard.sort((a, b) => (a.avg_response_hours || 999) - (b.avg_response_hours || 999));
                break;
            case 'sla_compliance_rate':
                leaderboard.sort((a, b) => (b.sla_compliance_rate || 0) - (a.sla_compliance_rate || 0));
                break;
            case 'active_days':
                leaderboard.sort((a, b) => b.active_days - a.active_days);
                break;
            default:
                leaderboard.sort((a, b) => b.total_actions - a.total_actions);
        }

        // Add ranks and limit
        leaderboard = leaderboard.slice(0, limit).map((item, index) => ({
            rank: index + 1,
            ...item
        }));

        return NextResponse.json({
            success: true,
            data: {
                leaderboard,
                sortBy,
                period,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('GET leaderboard error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch leaderboard' },
            { status: 500 }
        );
    }
}
