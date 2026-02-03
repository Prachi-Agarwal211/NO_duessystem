export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { APP_URLS } from '@/lib/urlHelper';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PUT(request) {
    try {
        // 1. Rate Limiting (Stricter for bulk actions)
        const rateLimitCheck = await rateLimit(request, RATE_LIMITS.ACTION);
        if (!rateLimitCheck.success) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please wait before processing more bulk actions.' },
                { status: 429 }
            );
        }

        // 2. Authentication
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, error: 'Missing Authorization' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
        }

        const { formIds, departmentName, action, reason } = await request.json();

        // 3. Validation
        if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
            return NextResponse.json({ success: false, error: 'No items selected' }, { status: 400 });
        }
        if (!departmentName || action !== 'approve') {
            return NextResponse.json({ success: false, error: 'Invalid parameters. Only bulk approval is allowed.' }, { status: 400 });
        }

        // 4. Get Staff Profile & Authorize - query by EMAIL first (handles ID mismatches)
        let profile;
        const { data: profileByEmail, error: profileByEmailError } = await supabaseAdmin
            .from('profiles')
            .select('id, role, assigned_department_ids, department_name')
            .eq('email', user.email.toLowerCase())
            .single();

        if (profileByEmailError && profileByEmailError.code === 'PGRST116') {
            const { data: profileById, error: profileByIdError } = await supabaseAdmin
                .from('profiles')
                .select('id, role, assigned_department_ids, department_name')
                .eq('id', user.id)
                .single();

            if (profileByIdError || !profileById) {
                return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
            }
            profile = profileById;
        } else if (profileByEmailError) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        } else {
            profile = profileByEmail;
        }

        if (profile.role !== 'department' && profile.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        // Verify Department Authorization
        // Fetch department ID first
        const { data: department } = await supabaseAdmin
            .from('departments')
            .select('id, display_name')
            .eq('name', departmentName)
            .single();

        if (!department) {
            return NextResponse.json({ success: false, error: 'Invalid department' }, { status: 400 });
        }

        // For department staff, verify authorization via either method
        if (profile.role === 'department') {
            // Method 1: Check assigned_department_ids array (UUID-based)
            const hasAssignment = profile.assigned_department_ids?.includes(department.id);

            // Method 2: Check department_name field (legacy/direct assignment)
            const hasNameMatch = profile.department_name === departmentName;

            const isAuthorized = hasAssignment || hasNameMatch;

            if (!isAuthorized) {
                console.error('❌ Bulk action authorization failed:', {
                    userId: user.id,
                    requestedDepartment: departmentName,
                    profileDepartmentName: profile.department_name,
                    assignedDepartmentIds: profile.assigned_department_ids
                });
                return NextResponse.json({
                    success: false,
                    error: `Not authorized for ${department.display_name}. Make sure your account is assigned to this department.`
                }, { status: 403 });
            }

            console.log('✅ Bulk action authorized:', { userId: user.id, department: departmentName });
        }

        // 5. Perform Bulk Updates
        const statusValue = action === 'approve' ? 'approved' : 'rejected';
        const actionUserId = profile.id;
        const now = new Date().toISOString();

        // We process sequentially or in parallel batches to handle "No Dues Status" rows
        // Since we need to update rows based on (form_id + department_name) which is composite
        // A single UPDATE ... WHERE IN (...) works if we target IDs, but we have form_ids.
        // Efficient approach:
        // a. Fetch all status rows for these forms & department
        const { data: statusRows, error: fetchError } = await supabaseAdmin
            .from('no_dues_status')
            .select('id, form_id, status')
            .in('form_id', formIds)
            .eq('department_name', departmentName);

        if (fetchError) throw fetchError;

        // Filter out already processed ones to avoid redundant updates
        const rowsToUpdate = statusRows.filter(row => row.status !== 'approved' && row.status !== 'rejected');
        const idsToUpdate = rowsToUpdate.map(r => r.id);

        if (idsToUpdate.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No pending items to update from selection',
                processedCount: 0
            });
        }

        // Bulk Update
        const updatePayload = {
            status: statusValue,
            action_at: now,
            action_by_user_id: actionUserId
        };
        if (action === 'reject') updatePayload.rejection_reason = reason;

        const { error: updateError } = await supabaseAdmin
            .from('no_dues_status')
            .update(updatePayload)
            .in('id', idsToUpdate);

        if (updateError) throw updateError;

        // 6. Post-Process: Update form statuses and trigger certificates
        // ✅ CRITICAL FIX: Database trigger doesn't exist - update status directly!
        if (action === 'approve') {
            // Get unique form IDs we just updated
            const affectedFormIds = [...new Set(rowsToUpdate.map(r => r.form_id))];

            for (const affectedFormId of affectedFormIds) {
                // Check all statuses for this form
                const { data: allStatuses } = await supabaseAdmin
                    .from('no_dues_status')
                    .select('status')
                    .eq('form_id', affectedFormId);

                const allApproved = allStatuses?.every(s => s.status === 'approved');
                const hasRejection = allStatuses?.some(s => s.status === 'rejected');

                let newFormStatus = 'in_progress';
                if (hasRejection) newFormStatus = 'rejected';
                else if (allApproved) newFormStatus = 'completed';

                // Update form status
                await supabaseAdmin
                    .from('no_dues_forms')
                    .update({
                        status: newFormStatus,
                        updated_at: now
                    })
                    .eq('id', affectedFormId);

                console.log(`📋 Bulk: Form ${affectedFormId} → ${newFormStatus}`);

                // Trigger certificate generation if completed
                if (newFormStatus === 'completed') {
                    try {
                        const { triggerCertificateGeneration } = await import('@/lib/certificateTrigger');
                        triggerCertificateGeneration(affectedFormId, actionUserId)
                            .then(r => console.log(r.success ? `✅ Cert generated: ${affectedFormId}` : `❌ Cert failed: ${r.error}`))
                            .catch(e => console.error('Cert error:', e.message));
                    } catch (importErr) {
                        // Fallback to API
                        fetch(APP_URLS.certificateGenerateApi(), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ formId: affectedFormId })
                        }).catch(console.error);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            processedCount: idsToUpdate.length,
            message: `Successfully processed ${idsToUpdate.length} items`
        });

    } catch (error) {
        console.error('Bulk Action Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
