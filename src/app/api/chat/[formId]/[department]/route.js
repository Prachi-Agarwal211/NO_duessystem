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

// GET: Fetch chat messages for a form + department (PUBLIC ACCESS - No auth required)
export async function GET(request, { params }) {
    try {
        const { formId, department } = params;
        const { searchParams } = new URL(request.url);

        // Pagination parameters
        const limit = parseInt(searchParams.get('limit')) || 50;
        const offset = parseInt(searchParams.get('offset')) || 0;

        // Validate inputs
        if (!formId || !department) {
            return NextResponse.json({ error: 'Form ID and department are required' }, { status: 400 });
        }

        // Get total count first for pagination
        const { count: totalCount } = await supabaseAdmin
            .from('no_dues_messages')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', formId)
            .eq('department_name', department);

        // Get messages with pagination - PUBLIC ACCESS
        const { data: messages, error } = await supabaseAdmin
            .from('no_dues_messages')
            .select('*')
            .eq('form_id', formId)
            .eq('department_name', department)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

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
                status,
                pagination: {
                    total: totalCount || 0,
                    limit,
                    offset,
                    hasMore: offset + limit < (totalCount || 0)
                }
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

        // Validate inputs
        if (!formId || !department) {
            return NextResponse.json({ error: 'Form ID and department are required' }, { status: 400 });
        }

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        if (!senderType || !['student', 'department'].includes(senderType)) {
            return NextResponse.json({ error: 'Valid sender type is required (student or department)' }, { status: 400 });
        }

        // Verify form exists
        const { data: form, error: formError } = await supabaseAdmin
            .from('no_dues_forms')
            .select('id, user_id, registration_no, student_name')
            .eq('id', formId)
            .single();

        if (formError || !form) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        // Authorization check based on sender type
        let senderId = null;

        if (senderType === 'student') {
            // STUDENTS: PUBLIC ACCESS - No authentication required
            senderId = null;
        } else if (senderType === 'department') {
            // DEPARTMENT STAFF: MUST be authenticated and assigned to this department
            const authHeader = request.headers.get('Authorization');
            if (!authHeader) {
                return NextResponse.json({ error: 'Department staff must be authenticated' }, { status: 401 });
            }

            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

            if (authError || !user) {
                return NextResponse.json({ error: 'Invalid session - please login again' }, { status: 401 });
            }

            // Verify staff is assigned to this department
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

            senderId = user.id;
        }

        // Insert message
        const { data: newMessage, error: insertError } = await supabaseAdmin
            .from('no_dues_messages')
            .insert({
                form_id: formId,
                department_name: department,
                sender_type: senderType,
                sender_id: senderId,
                sender_name: senderName || (senderType === 'student' ? form.student_name : 'Department Staff'),
                message: message.trim(),
                is_read: false
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
