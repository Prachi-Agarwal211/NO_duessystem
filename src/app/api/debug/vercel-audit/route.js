
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return { role: 'invalid_format' };
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload;
    } catch (e) {
        return { role: 'decode_failed' };
    }
}

export async function GET() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const decoded = decodeJWT(serviceKey || '');

    const envStatus = {
        url_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        service_key_present: !!serviceKey,
        service_key_role: decoded?.role || 'none',
        service_key_sub: decoded?.sub || 'none',
        node_env: process.env.NODE_ENV,
        supabase_is_mock: !!supabaseAdmin.isMock
    };

    try {
        // 1. Fetch with Is_Active filter
        const { count: activeCount, error: activeErr } = await supabaseAdmin
            .from('config_schools')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // 2. Fetch raw count (NO FILTERS)
        const { count: rawCount, error: rawErr } = await supabaseAdmin
            .from('config_schools')
            .select('*', { count: 'exact', head: true });

        // 3. Courses count for sanity
        const { count: coursesCount } = await supabaseAdmin
            .from('config_courses')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            success: true,
            diagnostics: envStatus,
            database: {
                active_school_count: activeCount,
                raw_school_count: rawCount,
                courses_count: coursesCount,
                active_error: activeErr?.message || null,
                raw_error: rawErr?.message || null
            }
        });
    } catch (err) {
        return NextResponse.json({
            success: false,
            diagnostics: envStatus,
            error: err.message
        });
    }
}
