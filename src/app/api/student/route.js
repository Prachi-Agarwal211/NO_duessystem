import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { studentFormSchema, validateWithZod } from '@/lib/zodSchemas';
import { ApiResponse } from '@/lib/apiResponse';
import applicationService from '@/lib/services/ApplicationService';

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
    const validation = validateWithZod(body, studentFormSchema);

    if (!validation.success) {
      return ApiResponse.validationError('Validation failed', validation.errors);
    }

    // 3. Submit via Prisma Service
    const result = await applicationService.submitApplication(validation.data);

    return ApiResponse.success(result.data, 'Application submitted successfully');

  } catch (error) {
    console.error('Submission Error:', error);
    return ApiResponse.error(error.message || 'Failed to submit application', 500);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');

    if (!registrationNo) return ApiResponse.error('Registration number required', 400);

    const result = await applicationService.getStudentStatus(registrationNo);

    if (!result.success) {
      return ApiResponse.error(result.error, 404);
    }

    return ApiResponse.success(result.data);
  } catch (error) {
    return ApiResponse.error('Internal server error', 500);
  }
}