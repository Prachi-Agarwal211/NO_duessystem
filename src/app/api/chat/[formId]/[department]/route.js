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
            .select(`
                *,
                sender:sender_id(
                    id,
                    full_name,
                    email,
                    role
                )
            `)
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
            .select('id, student_name, registration_no, status')
            .eq('id', formId)
            .single();

        // Get department status
        const { data: status } = await supabaseAdmin
            .from('no_dues_status')
            .select('status, rejection_reason, action_at, action_by')
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
        const { message, senderType, senderName, senderId } = body;

        // Validate inputs
        if (!formId || !department || !message?.trim() || !senderType || !senderName) {
            return NextResponse.json({ 
                error: 'Form ID, department, message, sender type, and sender name are required' 
            }, { status: 400 });
        }

        // Validate sender type
        if (!['student', 'department'].includes(senderType)) {
            return NextResponse.json({ 
                error: 'Valid sender type is required (student or department)' 
            }, { status: 400 });
        }

        // Validate message length
        if (message.length > 1000) {
            return NextResponse.json({ 
                error: 'Message too long. Maximum 1000 characters allowed.' 
            }, { status: 400 });
        }

        // Verify form exists
        const { data: form, error: formError } = await supabaseAdmin
            .from('no_dues_forms')
            .select('id, student_name, registration_no, status')
            .eq('id', formId)
            .single();

        if (formError || !form) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        // Authorization and sender ID determination
        let finalSenderId = senderId;

        if (senderType === 'department') {
            // DEPARTMENT STAFF: MUST be authenticated and assigned to this department
            const authHeader = request.headers.get('Authorization');
            if (!authHeader) {
                return NextResponse.json({ 
                    error: 'Department staff must be authenticated' 
                }, { status: 401 });
            }

            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

            if (authError || !user) {
                return NextResponse.json({ 
                    error: 'Invalid session - please login again' 
                }, { status: 401 });
            }

            // Verify staff is assigned to this department
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('assigned_department_ids, full_name, email')
                .eq('id', user.id)
                .single();

            const { data: dept } = await supabaseAdmin
                .from('departments')
                .select('id')
                .eq('name', department)
                .single();

            if (!profile?.assigned_department_ids?.includes(dept?.id)) {
                return NextResponse.json({ 
                    error: 'Not authorized for this department' 
                }, { status: 403 });
            }

            finalSenderId = user.id;
        }

        // Create message
        const messageData = {
            form_id: formId,
            department_name: department,
            message: message.trim(),
            sender_type: senderType,
            sender_name: senderName.trim(),
            sender_id: finalSenderId,
            is_read: false
        };

        // Insert message
        const { data: newMessage, error: insertError } = await supabaseAdmin
            .from('no_dues_messages')
            .insert([messageData])
            .select(`
                *,
                sender:sender_id(
                    id,
                    full_name,
                    email,
                    role
                )
            `)
            .single();

        if (insertError) {
            console.error('Message insert error:', insertError);
            return NextResponse.json({ 
                error: 'Failed to send message',
                details: insertError.message 
            }, { status: 500 });
        }

        // Update unread counts and notifications
        if (senderType === 'student') {
            await updateDepartmentUnreadCount(department, formId);
        }

        // Log the message for audit
        await logMessageActivity({
            formId,
            department,
            senderType,
            senderName,
            senderId: finalSenderId,
            messageLength: message.length
        });

        return NextResponse.json({
            success: true,
            data: newMessage
        });

    } catch (error) {
        console.error('Chat POST Error:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
}

// Helper function to update department unread count
async function updateDepartmentUnreadCount(departmentName, formId) {
    try {
        console.log(`📊 Updating unread count for department: ${departmentName}`);
        
        // This could trigger notifications to department staff
        // You could implement email/SMS notifications here
        
        // Update department activity tracking
        await supabaseAdmin
            .from('departments')
            .update({ 
                updated_at: new Date().toISOString() 
            })
            .eq('name', departmentName);
        
    } catch (error) {
        console.error('Failed to update unread count:', error);
    }
}

// Helper function to log message activity
async function logMessageActivity({ formId, department, senderType, senderName, senderId, messageLength }) {
    try {
        // Log to audit trail if needed
        console.log(`💬 Message logged: Form ${formId}, Dept ${department}, Type ${senderType}`);
        
        // You could implement more detailed logging here
        
    } catch (error) {
        console.error('Failed to log message activity:', error);
    }
}
