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

// GET: Fetch chat messages for a form + department (AUTHENTICATED ONLY)
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

        // Optional: Add authentication check for stricter security
        // Uncomment below if you want to require authentication for chat access
        /*
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }
        */

        // Get total count first for pagination
        const { count: totalCount } = await supabaseAdmin
            .from('no_dues_messages')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', formId)
            .eq('department_name', department);

        // Get messages with pagination
        // NOTE: Removed the sender join since sender_id is polymorphic
        // (can be auth.users UUID, student string, or null)
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

        // Get unread count for authenticated user
        let unreadCount = 0;
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const { data: { user } } = await supabaseAdmin.auth.getUser(token);
                if (user) {
                    const { count } = await supabaseAdmin
                        .from('no_dues_messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('form_id', formId)
                        .eq('department_name', department)
                        .neq('sender_id', user.id)
                        .eq('is_read', false);
                    unreadCount = count || 0;
                }
            } catch (e) {
                console.warn('Could not get unread count:', e);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                messages: messages || [],
                form,
                status,
                unreadCount,
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

        console.log('Chat POST:', { formId, department, senderType, senderName, messageLength: message?.length });

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
        console.log('Looking up form:', formId);
        const { data: form, error: formError } = await supabaseAdmin
            .from('no_dues_forms')
            .select('id, student_name, registration_no, status')
            .eq('id', formId)
            .single();

        console.log('Form lookup result:', { formFound: !!form, formError });

        if (formError || !form) {
            console.error('Form not found or error:', formError);
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

            // Verify staff is assigned to this department (or has department_name matching)
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id, assigned_department_ids, department_name, full_name, email')
                .eq('id', user.id)
                .single();

            // If profile doesn't exist, create one or use the user id directly
            const effectiveProfile = profile || { id: user.id, department_name: null, assigned_department_ids: [] };

            // Check if user's department_name matches OR assigned_department_ids includes the department
            const { data: dept } = await supabaseAdmin
                .from('departments')
                .select('id, name')
                .eq('name', department)
                .single();

            const isAuthorized =
                effectiveProfile?.department_name === department ||
                (dept && effectiveProfile?.assigned_department_ids?.includes(dept.id));

            if (!isAuthorized) {
                return NextResponse.json({
                    error: 'Not authorized for this department'
                }, { status: 403 });
            }

            finalSenderId = user.id;
        } else if (senderType === 'student') {
            // STUDENTS: Use JWT cookie for authentication (student_session)
            const { cookies } = await import('next/headers');
            const cookieStore = cookies();
            const studentToken = cookieStore.get('student_session')?.value;

            if (studentToken) {
                try {
                    // Verify the student JWT token
                    const { verify } = await import('jsonwebtoken');
                    const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
                    const decoded = verify(studentToken, JWT_SECRET);

                    // Verify student owns this form by registration number
                    const { data: studentForm } = await supabaseAdmin
                        .from('no_dues_forms')
                        .select('id, registration_no')
                        .eq('id', formId)
                        .single();

                    if (studentForm && studentForm.registration_no === decoded.regNo) {
                        finalSenderId = `student-${decoded.regNo}`;
                    } else {
                        console.warn('Student does not own this form:', { decoded: decoded.regNo, form: studentForm?.registration_no });
                        // Allow message but mark as unverified
                        finalSenderId = `student-unverified-${senderName}`;
                    }
                } catch (jwtError) {
                    console.warn('Student JWT verification failed:', jwtError.message);
                    finalSenderId = `student-${senderName}`;
                }
            } else {
                // No JWT cookie - use sender name as ID (legacy/anonymous)
                finalSenderId = `student-${senderName}`;
            }
        }

        // Create message - ensure sender_id is never null for the database
        const messageData = {
            form_id: formId,
            department_name: department,
            message: message.trim(),
            sender_type: senderType,
            sender_name: senderName.trim(),
            sender_id: finalSenderId || senderId || `student-${senderName}`,
            is_read: false
        };

        console.log('Attempting to insert message:', { formId, department, message: message.substring(0, 50) + '...' });

        // Insert message
        // NOTE: Removed the sender join since sender_id is polymorphic
        const { data: newMessage, error: insertError } = await supabaseAdmin
            .from('no_dues_messages')
            .insert([messageData])
            .select('*')
            .single();

        if (insertError) {
            console.error('Message insert error:', JSON.stringify(insertError, null, 2));
            return NextResponse.json({
                error: 'Failed to send message',
                details: insertError.message,
                hint: insertError.hint
            }, { status: 500 });
        }

        console.log('Message inserted successfully:', newMessage?.id);

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
        console.log(`💬 Message logged: Form ${formId}, Dept ${department}, Type ${senderType}`);
    } catch (error) {
        console.error('Failed to log message activity:', error);
    }
}
