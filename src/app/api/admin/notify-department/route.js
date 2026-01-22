import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDepartmentReminder } from '@/lib/emailService';
import { APP_URLS } from '@/lib/urlHelper';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

/**
 * POST /api/admin/notify-department
 * Admin can send targeted notifications to specific departments
 */
export async function POST(request) {
    try {
        const { data: { session } } = await supabaseAdmin.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const { departmentName, customMessage, includeStats = true } = body;

        if (!departmentName) {
            return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
        }

        // Get department staff emails
        const { data: staffMembers } = await supabaseAdmin
            .from('profiles')
            .select('email, full_name')
            .eq('role', 'department')
            .eq('department_name', departmentName)
            .not('email', 'is', null);

        if (!staffMembers || staffMembers.length === 0) {
            return NextResponse.json({ error: 'No staff found for this department' }, { status: 404 });
        }

        const staffEmails = staffMembers.map(s => s.email);

        // Get pending applications count for this department
        let pendingCount = 0;
        if (includeStats) {
            const { data: pendingApps } = await supabaseAdmin
                .from('no_dues_status')
                .select('id')
                .eq('department_name', departmentName)
                .eq('status', 'pending');

            pendingCount = pendingApps?.length || 0;
        }

        // Send notification email
        const result = await sendDepartmentReminder({
            staffEmails,
            departmentName: departmentName.replace(/_/g, ' '),
            pendingCount,
            customMessage: customMessage || `This is a reminder from administration. You have ${pendingCount} pending No Dues application${pendingCount > 1 ? 's' : ''} awaiting your review.`,
            dashboardUrl: APP_URLS.staffLogin(),
            isAdminTriggered: true
        });

        if (result.success) {
            // Log the admin action
            await supabaseAdmin
                .from('audit_logs')
                .insert({
                    actor_id: session.user.id,
                    actor_name: session.user.user_metadata?.full_name || 'Admin',
                    actor_role: profile.role,
                    action: 'notify_department',
                    target_id: departmentName,
                    target_type: 'department',
                    new_values: {
                        customMessage,
                        pendingCount,
                        staffNotified: staffEmails.length
                    },
                    ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                    user_agent: request.headers.get('user-agent') || 'unknown',
                    created_at: new Date().toISOString()
                });

            return NextResponse.json({
                success: true,
                message: `Notification sent to ${departmentName} department`,
                staffNotified: staffEmails.length,
                pendingCount,
                notifiedStaff: staffMembers.map(s => ({ name: s.full_name, email: s.email }))
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error || 'Failed to send notification'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Department notification error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}

/**
 * GET /api/admin/notify-department
 * Get list of departments and their pending counts for admin UI
 */
export async function GET(request) {
    try {
        const { data: { session } } = await supabaseAdmin.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Get all departments with pending counts
        const { data: departments } = await supabaseAdmin
            .from('departments')
            .select('name, display_name, email, is_active')
            .eq('is_active', true)
            .order('display_name');

        // Get pending counts for each department
        const { data: pendingStatuses } = await supabaseAdmin
            .from('no_dues_status')
            .select('department_name')
            .eq('status', 'pending');

        const pendingCounts = {};
        pendingStatuses?.forEach(status => {
            pendingCounts[status.department_name] = (pendingCounts[status.department_name] || 0) + 1;
        });

        // Get staff counts for each department
        const { data: staffData } = await supabaseAdmin
            .from('profiles')
            .select('department_name')
            .eq('role', 'department')
            .not('email', 'is', null);

        const staffCounts = {};
        staffData?.forEach(staff => {
            staffCounts[staff.department_name] = (staffCounts[staff.department_name] || 0) + 1;
        });

        // Combine data
        const departmentData = departments?.map(dept => ({
            name: dept.name,
            displayName: dept.display_name || dept.name.replace(/_/g, ' ').toUpperCase(),
            email: dept.email,
            pendingCount: pendingCounts[dept.name] || 0,
            staffCount: staffCounts[dept.name] || 0,
            canNotify: (staffCounts[dept.name] || 0) > 0
        })) || [];

        return NextResponse.json({
            success: true,
            departments: departmentData,
            totalDepartments: departmentData.length,
            departmentsWithPending: departmentData.filter(d => d.pendingCount > 0).length
        });

    } catch (error) {
        console.error('Get departments error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
