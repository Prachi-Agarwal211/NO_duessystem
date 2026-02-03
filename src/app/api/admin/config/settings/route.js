import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAdmin(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return false;
    // Query by email first (handles ID mismatches)
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('email', user.email.toLowerCase())
        .single();
    if (profile?.role === 'admin') return true;
    // Fallback to ID lookup
    const { data: profileById } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    return profileById?.role === 'admin';
}

export async function GET(request) {
    if (!await verifyAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin.from('system_settings').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Transform to object key-value
    const settings = {};
    data.forEach(item => {
        settings[item.key] = item.value;
    });

    return NextResponse.json({ success: true, settings, raw: data });
}

export async function POST(request) {
    if (!await verifyAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { key, value } = body;

    if (!key) return NextResponse.json({ error: 'Key is required' }, { status: 400 });

    const { error } = await supabaseAdmin
        .from('system_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
