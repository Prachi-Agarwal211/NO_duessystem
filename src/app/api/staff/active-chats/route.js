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

// GET: Get all active chats for a department with last message preview
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
            return NextResponse.json({ success: true, data: { chats: [], total: 0 } });
        }

        // Get department names
        const { data: depts } = await supabaseAdmin
            .from('departments')
            .select('id, name')
            .in('id', profile.assigned_department_ids);

        const deptNames = depts?.map(d => d.name) || [];

        if (deptNames.length === 0) {
            return NextResponse.json({ success: true, data: { chats: [], total: 0 } });
        }

        // Get all messages for these departments with form info
        const { data: messages, error: messagesError } = await supabaseAdmin
            .from('no_dues_messages')
            .select(`
                id,
                form_id,
                department_name,
                sender_type,
                sender_name,
                message,
                created_at,
                is_read,
                no_dues_forms!inner(id, student_name, registration_no, status)
            `)
            .in('department_name', deptNames)
            .order('created_at', { ascending: false });

        if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return NextResponse.json({ error: messagesError.message }, { status: 500 });
        }

        // Group messages by form_id and get chat summary for each
        const chatsByForm = {};
        (messages || []).forEach(msg => {
            const key = `${msg.form_id}-${msg.department_name}`;

            if (!chatsByForm[key]) {
                chatsByForm[key] = {
                    form_id: msg.form_id,
                    department_name: msg.department_name,
                    student_name: msg.no_dues_forms?.student_name,
                    registration_no: msg.no_dues_forms?.registration_no,
                    form_status: msg.no_dues_forms?.status,
                    last_message: msg.message,
                    last_message_sender: msg.sender_type,
                    last_message_time: msg.created_at,
                    total_messages: 0,
                    unread_count: 0
                };
            }

            chatsByForm[key].total_messages++;

            // Count unread messages from students
            if (msg.sender_type === 'student' && !msg.is_read) {
                chatsByForm[key].unread_count++;
            }
        });

        // Convert to array and sort by last message time
        const chats = Object.values(chatsByForm)
            .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));

        // Calculate totals
        const totalUnread = chats.reduce((sum, chat) => sum + chat.unread_count, 0);

        return NextResponse.json({
            success: true,
            data: {
                chats,
                total: chats.length,
                total_unread: totalUnread
            }
        });

    } catch (error) {
        console.error('Active Chats API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
