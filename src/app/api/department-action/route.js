export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import applicationService from '@/lib/services/ApplicationService';
import { ApiResponse } from '@/lib/apiResponse';
import { AuditLogger } from '@/lib/auditLogger';

/**
 * DEPART-ACTION API
 * Refactored to use standard Supabase Auth and ApplicationService
 */
export async function POST(request) {
    try {
        // 1. SECURE AUTHENTICATION
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return ApiResponse.error('Missing Authorization header', 401);
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return ApiResponse.error('Invalid or expired session', 401);
        }

        const authUserId = user.id;

        // 2. PARSE & VALIDATE BODY
        const body = await request.json();
        const { form_id, status, reason, remarks } = body;

        if (!form_id || !status) {
            return ApiResponse.error('Form ID and status are required', 400);
        }

        // 3. GET PROFILE & AUTHORIZATION
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, assigned_department_ids, department_name, full_name')
            .eq('id', authUserId)
            .single();

        if (profileError || !profile) {
            return ApiResponse.error('Profile not found', 404);
        }

        // Only department staff or admins can perform this action
        if (profile.role !== 'department' && profile.role !== 'admin') {
            return ApiResponse.error('Unauthorized: Insufficient permissions', 403);
        }

        // 4. VERIFY DEPARTMENT ACCESS
        // We fetch the target department if name is passed to ensure it matches profile
        const targetDepartment = body.department || profile.department_name;

        if (profile.role === 'department' && profile.department_name !== targetDepartment) {
            // Second check: check assigned_department_ids if UUID-based system is used
            // (Some parts of the app use UUIDs, some use names - we handle both for maximum reliability)
            const { data: deptData } = await supabase
                .from('departments')
                .select('id')
                .eq('name', targetDepartment)
                .single();

            const isAssigned = profile.assigned_department_ids?.includes(deptData?.id);

            if (!isAssigned && profile.department_name !== targetDepartment) {
                return ApiResponse.error(`Unauthorized for department: ${targetDepartment}`, 403);
            }
        }

        // 5. PERFORM ACTION VIA SERVICE
        let result;
        const normalizedStatus = status.toLowerCase();

        if (normalizedStatus === 'approved' || normalizedStatus === 'approve') {
            result = await applicationService.handleDepartmentApproval(
                form_id,
                targetDepartment,
                remarks,
                profile.full_name
            );
        } else if (normalizedStatus === 'rejected' || normalizedStatus === 'reject') {
            if (!reason) return ApiResponse.error('Rejection reason is required', 400);

            result = await applicationService.handleDepartmentRejection(
                form_id,
                targetDepartment,
                reason,
                remarks,
                profile.full_name
            );
        } else {
            return ApiResponse.error('Invalid status value', 400);
        }

        // 6. LOG ACTION
        AuditLogger.log(
            normalizedStatus === 'approved' ? AuditLogger.ACTIONS.APPROVE_FORM : AuditLogger.ACTIONS.REJECT_FORM,
            authUserId,
            { department: targetDepartment, reason: reason || null },
            form_id
        );

        return ApiResponse.success(result.data, `Application ${normalizedStatus} successfully`);

    } catch (error) {
        console.error('❌ Department Action Error:', error);
        return ApiResponse.error(error.message || 'Internal server error', 500);
    }
}
