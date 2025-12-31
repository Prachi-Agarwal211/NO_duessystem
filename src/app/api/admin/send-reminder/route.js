import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

/**
 * POST /api/admin/send-reminder
 * Send a gentle reminder to department staff about pending applications
 */
export async function POST(request) {
    try {
        // Auth check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { formId, departmentName, customMessage } = await request.json();

        if (!formId || !departmentName) {
            return NextResponse.json({ error: 'Missing formId or departmentName' }, { status: 400 });
        }

        // Get form data
        const { data: formData, error: formError } = await supabaseAdmin
            .from('no_dues_forms')
            .select('student_name, registration_no, created_at')
            .eq('id', formId)
            .single();

        if (formError || !formData) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        // Calculate days pending
        const createdAt = new Date(formData.created_at);
        const now = new Date();
        const daysPending = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

        // Get department and staff emails
        const { data: department } = await supabaseAdmin
            .from('departments')
            .select('id, name')
            .eq('name', departmentName)
            .single();

        if (!department) {
            return NextResponse.json({ error: 'Department not found' }, { status: 404 });
        }

        const { data: staffProfiles } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .contains('assigned_department_ids', [department.id])
            .eq('role', 'department');

        const staffEmails = staffProfiles?.map(p => p.email).filter(Boolean) || [];

        if (staffEmails.length === 0) {
            return NextResponse.json({ error: 'No staff members found for this department' }, { status: 400 });
        }

        // Send reminder email
        const { sendDepartmentReminder } = await import('@/lib/emailService');
        const emailResult = await sendDepartmentReminder({
            staffEmails,
            studentName: formData.student_name,
            registrationNo: formData.registration_no,
            departmentName,
            daysPending,
            customMessage: customMessage || null,
            dashboardUrl: 'https://nodues.jecrcuniversity.edu.in/staff/dashboard'
        });

        // Log the reminder
        await supabaseAdmin.from('reminder_logs').insert({
            form_id: formId,
            department_name: departmentName,
            staff_emails: staffEmails,
            custom_message: customMessage || null,
            sent_by: user.id
        });

        return NextResponse.json({
            success: true,
            message: `Reminder sent to ${staffEmails.length} staff member(s)`,
            emailResult,
            staffNotified: staffEmails
        });

    } catch (error) {
        console.error('Error sending reminder:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

/**
 * GET /api/admin/send-reminder
 * Get reminder history for a form or all reminders
 */
export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const formId = searchParams.get('formId');

        let query = supabaseAdmin
            .from('reminder_logs')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(100);

        if (formId) {
            query = query.eq('form_id', formId);
        }

        const { data: reminders, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            reminders: reminders || [],
            count: reminders?.length || 0
        });

    } catch (error) {
        console.error('Error fetching reminders:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
