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

/**
 * GET /api/staff/profile
 * Get current staff member's own profile with performance stats
 */
export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select(`
        id,
        full_name,
        email,
        department_name,
        designation,
        avatar_url,
        bio,
        role,
        is_active,
        created_at,
        last_active_at
      `)
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
        }

        if (profile.role !== 'department' && profile.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Not a staff member' }, { status: 403 });
        }

        // Get department display name
        const { data: dept } = await supabaseAdmin
            .from('departments')
            .select('display_name')
            .eq('name', profile.department_name)
            .single();

        // Get my actions
        const { data: myActions } = await supabaseAdmin
            .from('no_dues_status')
            .select('id, status, action_at, created_at')
            .eq('action_by_user_id', user.id)
            .not('action_at', 'is', null);

        // Calculate stats
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);

        const approved = myActions?.filter(a => a.status === 'approved').length || 0;
        const rejected = myActions?.filter(a => a.status === 'rejected').length || 0;
        const total = approved + rejected;

        const todayActions = myActions?.filter(a => new Date(a.action_at) >= today).length || 0;
        const weekActions = myActions?.filter(a => new Date(a.action_at) >= weekAgo).length || 0;
        const monthActions = myActions?.filter(a => new Date(a.action_at) >= monthAgo).length || 0;

        // Calculate avg response time
        let avgResponseHours = null;
        if (myActions && myActions.length > 0) {
            const responseTimes = myActions
                .filter(a => a.action_at && a.created_at)
                .map(a => (new Date(a.action_at) - new Date(a.created_at)) / (1000 * 60 * 60));

            if (responseTimes.length > 0) {
                avgResponseHours = Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 100) / 100;
            }
        }

        // Get department-wide stats for comparison
        const { data: deptActions } = await supabaseAdmin
            .from('no_dues_status')
            .select('action_by_user_id, action_at, created_at')
            .eq('department_name', profile.department_name)
            .not('action_at', 'is', null);

        let deptAvgHours = null;
        if (deptActions && deptActions.length > 0) {
            const deptTimes = deptActions
                .filter(a => a.action_at && a.created_at)
                .map(a => (new Date(a.action_at) - new Date(a.created_at)) / (1000 * 60 * 60));

            if (deptTimes.length > 0) {
                deptAvgHours = Math.round((deptTimes.reduce((a, b) => a + b, 0) / deptTimes.length) * 100) / 100;
            }
        }

        // Calculate my rank in department
        const staffCounts = {};
        deptActions?.forEach(a => {
            if (!staffCounts[a.action_by_user_id]) staffCounts[a.action_by_user_id] = 0;
            staffCounts[a.action_by_user_id]++;
        });

        const sortedStaff = Object.entries(staffCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id);

        const myRank = sortedStaff.indexOf(user.id) + 1;
        const totalStaff = sortedStaff.length;

        // Get pending count
        const { count: pendingCount } = await supabaseAdmin
            .from('no_dues_status')
            .select('*', { count: 'exact', head: true })
            .eq('department_name', profile.department_name)
            .eq('status', 'pending');

        // Get achievements
        const { data: achievements } = await supabaseAdmin
            .from('staff_achievements')
            .select('*')
            .eq('staff_id', user.id)
            .order('earned_at', { ascending: false });

        // Update last_active_at
        await supabaseAdmin
            .from('profiles')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', user.id);

        return NextResponse.json({
            success: true,
            data: {
                profile: {
                    ...profile,
                    department_display: dept?.display_name || profile.department_name
                },
                stats: {
                    total_actions: total,
                    approved,
                    rejected,
                    today_actions: todayActions,
                    week_actions: weekActions,
                    month_actions: monthActions,
                    approval_rate: total > 0 ? Math.round((approved / total) * 100 * 100) / 100 : 0,
                    avg_response_hours: avgResponseHours,
                    pending_in_queue: pendingCount || 0
                },
                comparison: {
                    my_avg_hours: avgResponseHours,
                    dept_avg_hours: deptAvgHours,
                    my_rank: myRank || null,
                    total_staff: totalStaff,
                    faster_than_avg: avgResponseHours && deptAvgHours ? avgResponseHours < deptAvgHours : null
                },
                achievements: achievements || []
            }
        });

    } catch (error) {
        console.error('GET staff profile error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/staff/profile
 * Update own profile (bio, avatar)
 */
export async function PUT(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Only allow updating bio and avatar_url for self
        const updates = {};
        if (body.bio !== undefined) updates.bio = body.bio;
        if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('PUT staff profile error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update profile' },
            { status: 500 }
        );
    }
}
