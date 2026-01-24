
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const envStatus = {
        url_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        url_value_start: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10),
        service_key_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        service_key_length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
        node_env: process.env.NODE_ENV,
        supabase_is_mock: !!supabaseAdmin.isMock
    };

    try {
        const { count, error } = await supabaseAdmin
            .from('config_schools')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            success: true,
            diagnostics: envStatus,
            database: {
                reachable: !error,
                school_count: count,
                error: error ? error.message : null
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
