import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            persistSession: false,
        },
        global: {
            fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
        }
    }
);

export async function GET(request) {
    try {
        // 1. Auth Check (Admin Only)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify Admin Role
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Fetch Stats
        // We can do this with a single query using filter count, or multiple specific queries.
        // For large datasets, separate `count` queries are often cleaner or safer.

        const [
            { count: totalForms },
            { count: generatedCount },
            { count: failedCount },
            { count: pendingCount }
        ] = await Promise.all([
            supabaseAdmin.from('no_dues_forms').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('no_dues_forms').select('*', { count: 'exact', head: true }).eq('certificate_status', 'generated'),
            supabaseAdmin.from('no_dues_forms').select('*', { count: 'exact', head: true }).eq('certificate_status', 'failed'),
            supabaseAdmin.from('no_dues_forms').select('*', { count: 'exact', head: true }).eq('certificate_status', 'pending')
                .eq('status', 'completed') // Only "completed" forms are eligible for certificates
        ]);

        // 3. Department Breakdown (Optional - requires complex aggregation, simplified for now)
        // We can add this later if needed.

        // 4. Recent Failures
        const { data: recentFailures } = await supabaseAdmin
            .from('no_dues_forms')
            .select('id, registration_no, student_name, certificate_error, updated_at')
            .eq('certificate_status', 'failed')
            .order('updated_at', { ascending: false })
            .limit(5);

        return NextResponse.json({
            success: true,
            stats: {
                total: totalForms || 0,
                generated: generatedCount || 0,
                failed: failedCount || 0,
                eligiblePending: pendingCount || 0,
                successRate: generatedCount ? Math.round((generatedCount / (generatedCount + failedCount)) * 100) : 0
            },
            recentFailures: recentFailures || []
        });

    } catch (error) {
        console.error('Certificate Stats API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
