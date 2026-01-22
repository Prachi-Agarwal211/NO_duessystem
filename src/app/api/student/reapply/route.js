import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimiter';
import { z } from 'zod';
import applicationService from '@/lib/services/ApplicationService';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Validation schema
const reapplySchema = z.object({
  form_id: z.string().uuid(),
  reapplication_reason: z.string().min(10, 'Reapplication reason must be at least 10 characters'),
  department: z.string().min(1, 'Department is required'),
  registration_no: z.string().min(1, 'Registration number is required')
});

/**
 * POST /api/student/reapply
 * Handle student reapplication with enhanced rate limiting and priority queue management
 */
export async function POST(request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = reapplySchema.parse(body);

    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.STUDENT_REAPPLY);
    
    if (!rateLimitResult.success) {
      return addRateLimitHeaders(
        NextResponse.json(
          { 
            error: rateLimitResult.error,
            retryAfter: rateLimitResult.retryAfter
          }, 
          { status: 429 }
        ),
        rateLimitResult
      );
    }

    // Check per-department reapplication limit
    const departmentLimitResult = await rateLimit(
      request, 
      RATE_LIMITS.REAPPLY_PER_DEPARTMENT, 
      `dept:${validatedData.department}`
    );
    
    if (!departmentLimitResult.success) {
      return addRateLimitHeaders(
        NextResponse.json(
          { 
            error: departmentLimitResult.error,
            retryAfter: departmentLimitResult.retryAfter
          }, 
          { status: 429 }
        ),
        departmentLimitResult
      );
    }

    // Check per-student reapplication limit
    const studentLimitResult = await rateLimit(
      request, 
      RATE_LIMITS.REAPPLY_PER_STUDENT, 
      `student:${validatedData.registration_no}`
    );
    
    if (!studentLimitResult.success) {
      return addRateLimitHeaders(
        NextResponse.json(
          { 
            error: studentLimitResult.error,
            retryAfter: studentLimitResult.retryAfter
          }, 
          { status: 429 }
        ),
        studentLimitResult
      );
    }

    // Check cooldown period
    const cooldownResult = await rateLimit(
      request, 
      RATE_LIMITS.REAPPLY_COOLDOWN, 
      `cooldown:${validatedData.registration_no}:${validatedData.department}`
    );
    
    if (!cooldownResult.success) {
      return addRateLimitHeaders(
        NextResponse.json(
          { 
            error: cooldownResult.error,
            retryAfter: cooldownResult.retryAfter
          }, 
          { status: 429 }
        ),
        cooldownResult
      );
    }

    // Validate inputs
    if (!validatedData.form_id) {
      return NextResponse.json(
        { success: false, error: 'Form ID is required' },
        { status: 400 }
      );
    }

    if (!validatedData.reapplication_reason || validatedData.reapplication_reason.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Reapplication reason must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (!validatedData.department) {
      return NextResponse.json(
        { success: false, error: 'Department is required' },
        { status: 400 }
      );
    }

    // Additional validation for department-specific rules
    await validateDepartmentReapplication(validatedData.form_id, validatedData.department, validatedData.registration_no);

    // Handle reapplication with enhanced tracking
    const result = await applicationService.handleReapplication(validatedData.form_id, {
      reason: validatedData.reapplication_reason.trim(),
      department: validatedData.department,
      studentId: validatedData.registration_no
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      rateLimit: {
        remaining: departmentLimitResult.remaining,
        resetTime: departmentLimitResult.resetTime
      }
    });

  } catch (error) {
    console.error('❌ Reapplication error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit reapplication'
      },
      { status: 500 }
    );
  }
}

/**
 * Validate department-specific reapplication rules
 */
async function validateDepartmentReapplication(formId, department, studentId) {
  try {
    // Check if student has already reapplied to this department too many times
    const { data: existingReapps } = await supabase
      .from('no_dues_reapplication_history')
      .select('department_responses')
      .eq('form_id', formId);

    const deptReapps = existingReapps?.filter(reapp => 
      reapp.department_responses?.[department]?.length > 0
    ).length || 0;

    if (deptReapps >= 5) {
      throw new Error(`Maximum 5 reapplications allowed for ${department} department`);
    }

    // Check if form is in correct state for reapplication
    const { data: form } = await supabase
      .from('no_dues_forms')
      .select('status, last_reapplied_at')
      .eq('id', formId)
      .single();

    if (!form) {
      throw new Error('Original form not found');
    }

    if (!['rejected', 'completed'].includes(form.status)) {
      throw new Error('Reapplication is only allowed for rejected or completed applications');
    }

    // Check cooldown period
    if (form.last_reapplied_at) {
      const cooldownEnd = new Date(form.last_reapplied_at);
      cooldownEnd.setHours(cooldownEnd.getHours() + 24); // 24 hour cooldown
      
      if (new Date() < cooldownEnd) {
        throw new Error('Please wait 24 hours between reapplications');
      }
    }

  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/student/reapply?formId=xxx
 * Get reapplication history for a form
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json(
        { success: false, error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Get reapplication history
    const result = await applicationService.getReapplicationHistory(formId);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Get reapplication history error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get reapplication history'
      },
      { status: 500 }
    );
  }
}
