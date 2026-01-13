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

// GET: Fetch chat messages for a form + department
export async function GET(request, { params }) {
    try {
        const { formId, department } = params;

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

        // Get messages
        const { data: messages, error } = await supabaseAdmin
            .from('no_dues_messages')
            .select('*')
            .eq('form_id', formId)
            .eq('department_name', department)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get form details for context
        const { data: form } = await supabaseAdmin
            .from('no_dues_forms')
            .select('id, student_name, registration_no')
            .eq('id', formId)
            .single();

        // Get rejection reason if exists
        const { data: status } = await supabaseAdmin
            .from('no_dues_status')
            .select('status, rejection_reason')
            .eq('form_id', formId)
            .eq('department_name', department)
            .single();

        return NextResponse.json({
            success: true,
            data: {
                messages: messages || [],
                form,
                status
            }
        });

    } catch (error) {
        console.error('Chat GET Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Send a new message
export async function POST(request, { params }) {
    try {
        const { formId, department } = params;
        const body = await request.json();
        const { message, senderType, senderName } = body;

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

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

        // Verify form exists
        const { data: form, error: formError } = await supabaseAdmin
            .from('no_dues_forms')
            .select('id, user_id')
            .eq('id', formId)
            .single();

        if (formError || !form) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        // Authorization check
        if (senderType === 'student') {
            // Student must own the form
            if (form.user_id !== user.id) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }
        } else if (senderType === 'department') {
            // Staff must be assigned to this department
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('assigned_department_ids')
                .eq('id', user.id)
                .single();

            const { data: dept } = await supabaseAdmin
                .from('departments')
                .select('id')
                .eq('name', department)
                .single();

            if (!profile?.assigned_department_ids?.includes(dept?.id)) {
                return NextResponse.json({ error: 'Not authorized for this department' }, { status: 403 });
            }
        } else {
            return NextResponse.json({ error: 'Invalid sender type' }, { status: 400 });
        }

        // Insert message
        const { data: newMessage, error: insertError } = await supabaseAdmin
            .from('no_dues_messages')
            .insert({
                form_id: formId,
                department_name: department,
                sender_type: senderType,
                sender_id: user.id,
                sender_name: senderName,
                message: message.trim()
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting message:', insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: newMessage
        });

    } catch (error) {
        console.error('Chat POST Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
