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
 * GET /api/admin/staff/[id]
 * Get individual staff profile with detailed performance metrics
 */
export async function GET(request, { params }) {
    try {
        const adminCheck = await verifyAdmin(request);
        if (adminCheck.error) {
            return NextResponse.json(
                { success: false, error: adminCheck.error },
                { status: adminCheck.status }
            );
        }

        const staffId = params.id;
        if (!staffId) {
            return NextResponse.json(
                { success: false, error: 'Staff ID is required' },
                { status: 400 }
            );
        }

        // Get staff performance from materialized view via RPC
        const { data: performanceData, error: perfError } = await supabaseAdmin
            .rpc('get_staff_performance', { p_staff_id: staffId });

        if (perfError) {
            console.error('Error fetching staff performance:', perfError);
            // Fallback to direct query if RPC fails
        }

        // Get basic profile if RPC fails or for additional fields
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
        is_active,
        created_at,
        last_active_at
      `)
            .eq('id', staffId)
            .single();

        if (profileError || !profile) {
            return NextResponse.json(
                { success: false, error: 'Staff member not found' },
                { status: 404 }
            );
        }

        // Get department display name
        const { data: dept } = await supabaseAdmin
            .from('departments')
            .select('display_name')
            .eq('name', profile.department_name)
            .single();

        // Get recent activity (last 20 actions)
        const { data: recentActivity } = await supabaseAdmin
            .from('no_dues_status')
            .select(`
        id,
        status,
        action_at,
        rejection_reason,
        no_dues_forms!inner (
          student_name,
          registration_no,
          course,
          branch
        )
      `)
            .eq('action_by_user_id', staffId)
            .not('action_at', 'is', null)
            .order('action_at', { ascending: false })
            .limit(20);

        // Get activity by day of week
        const { data: activityStats } = await supabaseAdmin
            .from('no_dues_status')
            .select('action_at, status')
            .eq('action_by_user_id', staffId)
            .not('action_at', 'is', null);

        // Calculate stats if RPC didn't return data
        let stats = performanceData?.[0] || null;

        if (!stats && activityStats) {
            const now = new Date();
            const today = new Date(now.setHours(0, 0, 0, 0));
            const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);

            const approved = activityStats.filter(s => s.status === 'approved').length;
            const rejected = activityStats.filter(s => s.status === 'rejected').length;
            const total = approved + rejected;

            stats = {
                total_actions: total,
                total_approved: approved,
                total_rejected: rejected,
                today_actions: activityStats.filter(s => new Date(s.action_at) >= today).length,
                week_actions: activityStats.filter(s => new Date(s.action_at) >= weekAgo).length,
                month_actions: activityStats.filter(s => new Date(s.action_at) >= monthAgo).length,
                approval_rate: total > 0 ? Math.round((approved / total) * 100 * 100) / 100 : 0,
                avg_response_hours: null, // Would need created_at from status records
                sla_compliance_rate: null
            };
        }

        // Get achievements/badges
        const { data: achievements } = await supabaseAdmin
            .from('staff_achievements')
            .select('*')
            .eq('staff_id', staffId)
            .order('earned_at', { ascending: false });

        // Get pending count for this staff's department
        const { count: pendingCount } = await supabaseAdmin
            .from('no_dues_status')
            .select('*', { count: 'exact', head: true })
            .eq('department_name', profile.department_name)
            .eq('status', 'pending');

        return NextResponse.json({
            success: true,
            data: {
                profile: {
                    ...profile,
                    department_display: dept?.display_name || profile.department_name
                },
                stats: stats || {},
                recentActivity: recentActivity || [],
                achievements: achievements || [],
                pendingInQueue: pendingCount || 0
            }
        });

    } catch (error) {
        console.error('GET staff profile error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch staff profile' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/staff/[id]
 * Update staff profile (designation, bio, avatar)
 */
export async function PUT(request, { params }) {
    try {
        const adminCheck = await verifyAdmin(request);
        if (adminCheck.error) {
            return NextResponse.json(
                { success: false, error: adminCheck.error },
                { status: adminCheck.status }
            );
        }

        const staffId = params.id;
        const body = await request.json();

        const updates = {};
        if (body.designation !== undefined) updates.designation = body.designation;
        if (body.bio !== undefined) updates.bio = body.bio;
        if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
        if (body.full_name !== undefined) updates.full_name = body.full_name;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, error: 'No fields to update' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', staffId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('PUT staff profile error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update staff profile' },
            { status: 500 }
        );
    }
}
