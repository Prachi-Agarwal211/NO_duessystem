import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { studentFormSchema, validateWithZod } from '@/lib/zodSchemas';
import { APP_URLS } from '@/lib/urlHelper';
import { ApiResponse } from '@/lib/apiResponse';
import applicationService from '@/lib/services/ApplicationService';

// Create Supabase admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/student
 * Submit a new No Dues application
 * 
 * This route handles form submission with:
 * - Server-side validation
 * - Database insertion
 * - Email notifications to all departments
 * - Real-time updates
 */
export async function POST(request) {
  try {
    // Rate limiting: Prevent spam form submissions
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.SUBMIT);
    if (!rateLimitCheck.success) {
      return ApiResponse.error(
        rateLimitCheck.error || 'Too many requests',
        429,
        { retryAfter: rateLimitCheck.retryAfter }
      );
    }

    const body = await request.json();

    // ZOD validation
    const validation = validateWithZod(body, studentFormSchema);
    if (!validation.success) {
      const errorFields = Object.keys(validation.errors);
      const firstError = validation.errors[errorFields[0]];

      return ApiResponse.validationError(
        firstError || 'Please check all required fields',
        validation.errors
      );
    }

    // Use application service for submission
    const result = await applicationService.submitApplication(validation.data);

    return ApiResponse.success(result.data, 'Application submitted successfully');

  } catch (error) {
    console.error('❌ Student submission error:', error);
    
    return ApiResponse.error(
      error.message || 'Failed to submit application'
    );
  }
}

/**
 * GET /api/student?registration_no=XXX
 * Check if a form exists for a registration number
 */
export async function GET(request) {
  try {
    // Rate limiting for status check queries
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.READ);
    if (!rateLimitCheck.success) {
      return ApiResponse.error(
        rateLimitCheck.error || 'Too many requests',
        429,
        { retryAfter: rateLimitCheck.retryAfter }
      );
    }

    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');

    if (!registrationNo) {
      return ApiResponse.error(
        'Registration number is required',
        400
      );
    }

    // Use unified application service to get student status
    const result = await applicationService.getStudentStatus(registrationNo);

    return ApiResponse.success(result.data, 'Student status retrieved');

  } catch (error) {
    console.error('❌ Student GET API Error:', error);
    return ApiResponse.error(
      'Internal server error',
      500
    );
  }
}