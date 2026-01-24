import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { studentFormSchema, validateWithZod } from '@/lib/zodSchemas';
import { ApiResponse } from '@/lib/apiResponse';
import applicationService from '@/lib/services/ApplicationService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/student
 * Submit a new No Dues application using Supabase
 *
 * This route handles form submission with:
 * - Server-side validation
 * - Database insertion via Supabase
 * - Email notifications to all departments
 * - Real-time updates
 */
export async function POST(request) {
  try {
    // Rate limiting: Prevent spam form submissions
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.SUBMIT);
    if (!rateLimitCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitCheck.error || 'Too many requests',
          retryAfter: rateLimitCheck.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60'
          }
        }
      );
    }

    const body = await request.json();

    // ZOD validation
    const validation = validateWithZod(body, studentFormSchema);
    if (!validation.success) {
      const errorFields = Object.keys(validation.errors);
      const firstError = validation.errors[errorFields[0]];

      return NextResponse.json(
        {
          success: false,
          error: firstError || 'Please check all required fields',
          details: validation.errors,
          field: errorFields[0]
        },
        { status: 400 }
      );
    }

    // Use ApplicationService for database operations
    const result = await applicationService.submitApplication(validation.data);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Student submission error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit application'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/student?registration_no=XXX
 * Check if a form exists for a registration number using Supabase
 */
export async function GET(request) {
  try {
    // Rate limiting for status check queries
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.READ);
    if (!rateLimitCheck.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitCheck.error || 'Too many requests',
        retryAfter: rateLimitCheck.retryAfter
      }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');

    if (!registrationNo) {
      return NextResponse.json(
        { success: false, error: 'Registration number is required' },
        { status: 400 }
      );
    }

    // Use ApplicationService to get student status
    const result = await applicationService.getStudentStatus(registrationNo);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Student GET API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}