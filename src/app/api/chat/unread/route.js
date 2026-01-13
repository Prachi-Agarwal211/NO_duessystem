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

// GET: Get unread message counts for a department
export async function GET(request) {
    try {
        // Verify auth
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // Get user's departments
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('assigned_department_ids')
            .eq('id', user.id)
            .single();

        if (!profile?.assigned_department_ids?.length) {
            return NextResponse.json({ success: true, data: { counts: [] } });
        }

        // Get department names
        const { data: depts } = await supabaseAdmin
            .from('departments')
            .select('name')
            .in('id', profile.assigned_department_ids);

        const deptNames = depts?.map(d => d.name) || [];

        // Get unread message counts grouped by form_id and department
        const { data: messages, error: messagesError } = await supabaseAdmin
            .from('no_dues_messages')
            .select('form_id, department_name, is_read, no_dues_forms!inner(student_name, registration_no)')
            .in('department_name', deptNames)
            .eq('sender_type', 'student')
            .eq('is_read', false);

        if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return NextResponse.json({ error: messagesError.message }, { status: 500 });
        }

        // Group by form_id
        const unreadByForm = {};
        (messages || []).forEach(msg => {
            if (!unreadByForm[msg.form_id]) {
                unreadByForm[msg.form_id] = {
                    form_id: msg.form_id,
                    student_name: msg.no_dues_forms?.student_name,
                    registration_no: msg.no_dues_forms?.registration_no,
                    department_name: msg.department_name,
                    unread_count: 0
                };
            }
            unreadByForm[msg.form_id].unread_count++;
        });

        return NextResponse.json({
            success: true,
            data: {
                counts: Object.values(unreadByForm),
                total_unread: Object.values(unreadByForm).reduce((sum, f) => sum + f.unread_count, 0)
            }
        });

    } catch (error) {
        console.error('Unread Messages API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
