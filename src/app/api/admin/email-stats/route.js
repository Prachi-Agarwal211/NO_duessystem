import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

/**
 * GET /api/admin/email-stats
 * Get email monitoring statistics and recent logs
 */
export async function GET(request) {
    try {
        // Auth check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '24h';

        // Calculate time range
        const now = new Date();
        let startDate;
        switch (period) {
            case '7d':
                startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
                break;
            default: // 24h
                startDate = new Date(now - 24 * 60 * 60 * 1000);
        }

        // Get email logs (if table exists)
        let emailStats = {
            total: 0,
            sent: 0,
            failed: 0,
            pending: 0,
            byType: {},
            recentLogs: []
        };

        try {
            // Try to get stats from email_logs table
            const { data: logs, error: logsError } = await supabaseAdmin
                .from('email_logs')
                .select('*')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false })
                .limit(100);

            if (!logsError && logs) {
                emailStats = {
                    total: logs.length,
                    sent: logs.filter(l => l.status === 'sent').length,
                    failed: logs.filter(l => l.status === 'failed').length,
                    pending: logs.filter(l => l.status === 'pending').length,
                    byType: logs.reduce((acc, log) => {
                        acc[log.email_type] = (acc[log.email_type] || 0) + 1;
                        return acc;
                    }, {}),
                    recentLogs: logs.slice(0, 20).map(log => ({
                        id: log.id,
                        recipient: log.recipient_email,
                        subject: log.subject,
                        type: log.email_type,
                        status: log.status,
                        createdAt: log.created_at,
                        error: log.error_message
                    }))
                };
            }
        } catch (e) {
            console.log('Email logs table may not exist yet:', e.message);
            // Table doesn't exist yet - return empty stats
        }

        // Get reminder stats
        let reminderStats = { total: 0, recentReminders: [] };
        try {
            const { data: reminders } = await supabaseAdmin
                .from('reminder_logs')
                .select('*')
                .gte('sent_at', startDate.toISOString())
                .order('sent_at', { ascending: false })
                .limit(20);

            if (reminders) {
                reminderStats = {
                    total: reminders.length,
                    recentReminders: reminders.map(r => ({
                        id: r.id,
                        department: r.department_name,
                        sentAt: r.sent_at,
                        staffCount: r.staff_emails?.length || 0
                    }))
                };
            }
        } catch (e) {
            console.log('Reminder logs table may not exist yet:', e.message);
        }

        // Calculate delivery rate
        const deliveryRate = emailStats.total > 0
            ? ((emailStats.sent / emailStats.total) * 100).toFixed(1)
            : 100;

        return NextResponse.json({
            success: true,
            period,
            stats: {
                emails: emailStats,
                reminders: reminderStats,
                deliveryRate: parseFloat(deliveryRate),
                healthStatus: emailStats.failed > emailStats.sent ? 'degraded' : 'healthy'
            }
        });

    } catch (error) {
        console.error('Error fetching email stats:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
