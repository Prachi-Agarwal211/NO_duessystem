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

// GET: Get unread message counts for a staff member
// IMPORTANT: Only shows chats for rejections made BY THIS USER
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
            .select('id, assigned_department_ids, role')
            .eq('id', user.id)
            .single();

        if (!profile?.assigned_department_ids?.length) {
            return NextResponse.json({ success: true, data: { counts: [], total_unread: 0 } });
        }

        // Get department names
        const { data: depts } = await supabaseAdmin
            .from('departments')
            .select('name')
            .in('id', profile.assigned_department_ids);

        const deptNames = depts?.map(d => d.name) || [];

        // Get ALL unread messages for these departments from students
        // NOTE: Removed the no_dues_forms join to avoid relationship issues
        const { data: messages, error: messagesError } = await supabaseAdmin
            .from('no_dues_messages')
            .select('form_id, department_name, is_read, sender_name')
            .in('department_name', deptNames)
            .eq('sender_type', 'student')
            .eq('is_read', false);

        if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return NextResponse.json({ error: messagesError.message }, { status: 500 });
        }

        // Get form details separately to avoid join issues
        const formIds = [...new Set(messages?.map(m => m.form_id) || [])];
        let formDetails = {};

        if (formIds.length > 0) {
            const { data: forms } = await supabaseAdmin
                .from('no_dues_forms')
                .select('id, student_name, registration_no')
                .in('id', formIds);

            formDetails = (forms || []).reduce((acc, form) => {
                acc[form.id] = form;
                return acc;
            }, {});
        }

        const unreadByForm = {};
        (messages || []).forEach(msg => {
            const key = msg.form_id;
            const formDetail = formDetails[msg.form_id] || {};

            if (!unreadByForm[key]) {
                unreadByForm[key] = {
                    form_id: msg.form_id,
                    student_name: formDetail.student_name || msg.sender_name || 'Unknown',
                    registration_no: formDetail.registration_no || 'N/A',
                    department_name: msg.department_name,
                    unread_count: 0
                };
            }
            unreadByForm[key].unread_count++;
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
