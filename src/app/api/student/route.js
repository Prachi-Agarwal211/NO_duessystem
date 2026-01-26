import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { studentFormSchema, validateWithZod } from '@/lib/zodSchemas';
import { ApiResponse } from '@/lib/apiResponse';
import applicationService from '@/lib/services/ApplicationService';
import { supabase } from '@/lib/supabaseClient';

// Force dynamic rendering - this route uses request.url
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    // 1. Rate Limiting
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.SUBMIT);
    if (!rateLimitCheck.success) {
      return ApiResponse.error('Too many requests', 429);
    }

    // 2. Parse & Validate
    const body = await request.json();

    // Check if this is a reapplication request
    if (body.action === 'reapply') {
      return handleReapplication(request, body);
    }

    // Regular form submission
    const validation = validateWithZod(body, studentFormSchema);

    if (!validation.success) {
      return ApiResponse.validationError('Validation failed', validation.errors);
    }

    // 3. Submit via Application Service
    const result = await applicationService.submitApplication(validation.data);

    return ApiResponse.success(result.data, 'Application submitted successfully');

  } catch (error) {
    console.error('Submission Error:', error);
    return ApiResponse.error(error.message || 'Failed to submit application', 500);
  }
}

async function handleReapplication(request, body) {
  try {
    const { formId, reason, department } = body;

    if (!formId) {
      return ApiResponse.error('Form ID required for reapplication', 400);
    }

    // Verify form exists
    const { data: form, error: formError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, status')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return ApiResponse.error('Form not found', 404);
    }

    // Check if department is specified - for per-department reapplication
    if (department) {
      // Verify the specific department has rejected this form
      const { data: deptStatus, error: deptError } = await supabase
        .from('no_dues_status')
        .select('status, rejection_reason')
        .eq('form_id', formId)
        .eq('department_name', department)
        .single();

      if (deptError || !deptStatus) {
        return ApiResponse.error('Department status not found', 404);
      }

      if (deptStatus.status !== 'rejected') {
        return ApiResponse.error(`This department has not rejected your form. Current status: ${deptStatus.status}`, 400);
      }
    } else {
      // No department specified - check if ANY department has rejected
      const { data: rejectedStatuses, error: statusesError } = await supabase
        .from('no_dues_status')
        .select('department_name')
        .eq('form_id', formId)
        .eq('status', 'rejected');

      if (statusesError) {
        return ApiResponse.error('Failed to check department statuses', 500);
      }

      if (!rejectedStatuses || rejectedStatuses.length === 0) {
        return ApiResponse.error('No departments have rejected your form. You can only reapply to rejected departments.', 400);
      }
    }

    // Process reapplication
    const result = await applicationService.handleReapplication(formId, {
      reason,
      department
    });

    return ApiResponse.success(result, 'Reapplication submitted successfully. The department will review your form again.');

  } catch (error) {
    console.error('Reapplication Error:', error);
    return ApiResponse.error(error.message || 'Failed to process reapplication', 500);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');
    const formId = searchParams.get('form_id');

    if (registrationNo) {
      // Get student status by registration number
      const result = await applicationService.getStudentStatus(registrationNo);
      if (!result.success) {
        return ApiResponse.error(result.error, 404);
      }
      return ApiResponse.success(result.data);
    }

    if (formId) {
      // Get reapplication history
      const result = await applicationService.getReapplicationHistory(formId);
      if (!result.success) {
        return ApiResponse.error(result.error, 404);
      }
      return ApiResponse.success(result.data);
    }

    return ApiResponse.error('Registration number or form ID required', 400);
  } catch (error) {
    console.error('Get Status Error:', error);
    return ApiResponse.error('Internal server error', 500);
  }
}
