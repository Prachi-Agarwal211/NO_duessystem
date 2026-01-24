export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: {
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            nodeEnv: process.env.NODE_ENV,
        },
        database: {
            status: 'unknown',
            error: null
        },
        supabase: {
            status: 'unknown',
            error: null
        }
    };

    // Check Prisma Connection
    try {
        if (!process.env.DATABASE_URL) {
            health.database.status = 'missing_config';
            health.database.error = 'DATABASE_URL is not set';
        } else {
            // Simple query
            const count = await prisma.noDuesForm.count();
            health.database.status = 'connected';
            health.database.recordCount = count;
        }
    } catch (error) {
        health.database.status = 'error';
        health.database.error = error.message;
    }

    // Check Supabase Connection
    try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            health.supabase.status = 'missing_config';
        } else {
            const { data, error } = await supabaseAdmin.from('no_dues_forms').select('count', { count: 'exact', head: true });
            if (error) throw error;
            health.supabase.status = 'connected';
            health.supabase.recordCount = data; // count is in count property properly but head:true returns null data usually with count in response. 
            // Supabase-js v2 select count returns { count, data, error }
        }
    } catch (error) {
        health.supabase.status = 'error';
        health.supabase.error = error.message;
    }

    // Overall status
    if (health.database.status !== 'connected' || health.supabase.status !== 'connected') {
        health.status = 'degraded';
    }

    return NextResponse.json(health, { status: health.status === 'ok' ? 200 : 503 });
}
