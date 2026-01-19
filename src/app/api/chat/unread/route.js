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

        // CRITICAL: Find all rejections made BY THIS USER
        // Chat should only go to the person who rejected
        const { data: myRejections, error: rejectionsError } = await supabaseAdmin
            .from('no_dues_status')
            .select('form_id, department_name')
            .eq('action_by_user_id', profile.id)
            .eq('status', 'rejected')
            .in('department_name', deptNames);

        if (rejectionsError) {
            console.error('Error fetching rejections:', rejectionsError);
            return NextResponse.json({ error: rejectionsError.message }, { status: 500 });
        }

        if (!myRejections || myRejections.length === 0) {
            // This user hasn't rejected anything - no chats to show
            return NextResponse.json({ success: true, data: { counts: [], total_unread: 0 } });
        }

        // Build formId filters for messages
        const formIds = myRejections.map(r => r.form_id);

        // Create a map to quickly check form_id + department combinations
        const myRejectionMap = new Set(
            myRejections.map(r => `${r.form_id}|${r.department_name}`)
        );

        // Get unread messages only for form_ids that this user rejected
        const { data: messages, error: messagesError } = await supabaseAdmin
            .from('no_dues_messages')
            .select('form_id, department_name, is_read, no_dues_forms!inner(student_name, registration_no)')
            .in('form_id', formIds)
            .eq('sender_type', 'student')
            .eq('is_read', false);

        if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return NextResponse.json({ error: messagesError.message }, { status: 500 });
        }

        // Filter messages: only include if THIS USER rejected this form+department
        const unreadByForm = {};
        (messages || []).forEach(msg => {
            const key = `${msg.form_id}|${msg.department_name}`;

            // Only count if this user rejected this specific form+department combo
            if (!myRejectionMap.has(key)) {
                return; // Skip - this was rejected by someone else
            }

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
