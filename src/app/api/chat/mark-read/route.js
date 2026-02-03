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
            fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
        },
    }
);

// POST: Mark messages as read
export async function POST(request) {
    try {
        const body = await request.json();
        const { formId, departmentName, readerType } = body;

        if (!formId || !departmentName || !readerType) {
            return NextResponse.json({
                error: 'formId, departmentName, and readerType are required'
            }, { status: 400 });
        }

        // For department readers, require authentication
        if (readerType === 'department') {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

            if (authError || !user) {
                return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
            }

            // Verify staff is assigned to this department - query by EMAIL first
            let profile;
            const { data: profileByEmail, error: profileByEmailError } = await supabaseAdmin
                .from('profiles')
                .select('assigned_department_ids, department_name')
                .eq('email', user.email.toLowerCase())
                .single();

            if (profileByEmailError && profileByEmailError.code === 'PGRST116') {
                const { data: profileById, error: profileByIdError } = await supabaseAdmin
                    .from('profiles')
                    .select('assigned_department_ids, department_name')
                    .eq('id', user.id)
                    .single();

                if (profileByIdError || !profileById) {
                    return NextResponse.json({ error: 'Not authorized for this department' }, { status: 403 });
                }
                profile = profileById;
            } else if (profileByEmailError) {
                return NextResponse.json({ error: 'Not authorized for this department' }, { status: 403 });
            } else {
                profile = profileByEmail;
            }

            const { data: dept } = await supabaseAdmin
                .from('departments')
                .select('id')
                .eq('name', departmentName)
                .single();

            if (!profile?.assigned_department_ids?.includes(dept?.id)) {
                return NextResponse.json({ error: 'Not authorized for this department' }, { status: 403 });
            }

            // Mark student messages as read (department is reading)
            const { data: updated, error: updateError } = await supabaseAdmin
                .from('no_dues_messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('form_id', formId)
                .eq('department_name', departmentName)
                .eq('sender_type', 'student')
                .eq('is_read', false)
                .select();

            if (updateError) {
                console.error('Error marking messages as read:', updateError);
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                data: { marked_read: updated?.length || 0 }
            });
        } else if (readerType === 'student') {
            // For students, mark department messages as read (no auth required)
            const { data: updated, error: updateError } = await supabaseAdmin
                .from('no_dues_messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('form_id', formId)
                .eq('department_name', departmentName)
                .eq('sender_type', 'department')
                .eq('is_read', false)
                .select();

            if (updateError) {
                console.error('Error marking messages as read:', updateError);
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                data: { marked_read: updated?.length || 0 }
            });
        }

        return NextResponse.json({ error: 'Invalid readerType' }, { status: 400 });

    } catch (error) {
        console.error('Mark Read API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
