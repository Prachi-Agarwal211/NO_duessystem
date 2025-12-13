import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client with service role key for bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration for check-status API');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * GET /api/student/check-status?registration_no=XXX
 * Public endpoint to check no dues form status by registration number
 */
export async function GET(request) {
  try {
    // Check if Supabase is configured
    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          error: 'Service configuration error. Please contact administrator.',
          code: 'SERVICE_CONFIG_ERROR'
        },
        { status: 503 }
      );
    }

    // Get registration number from query params
    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');

    // Validation
    if (!registrationNo) {
      return NextResponse.json(
        { 
          error: 'Registration number is required',
          code: 'MISSING_REG_NO'
        },
        { status: 400 }
      );
    }

    // Validate format (alphanumeric, 6-15 characters)
    const regNoPattern = /^[A-Z0-9]{6,15}$/i;
    if (!regNoPattern.test(registrationNo)) {
      return NextResponse.json(
        { 
          error: 'Invalid registration number format. Use alphanumeric characters (6-15 characters)',
          code: 'INVALID_FORMAT'
        },
        { status: 400 }
      );
    }

    // Query the database with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const { data, error } = await supabaseAdmin
          .from('no_dues_forms')
          .select('*')
          .eq('registration_no', registrationNo.toUpperCase())
          .single();

        // Handle specific errors
        if (error) {
          if (error.code === 'PGRST116') {
            // No rows found - this is expected, not an error
            return NextResponse.json(
              { 
                found: false,
                registration_no: registrationNo.toUpperCase(),
                message: 'No application found with this registration number'
              },
              { status: 404 }
            );
          }
          
          // Other database errors
          lastError = error;
          console.error(`Attempt ${attempts}/${maxAttempts} failed:`, error);
          
          // If not last attempt, wait before retry
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            continue;
          }
          
          throw error;
        }

        // Success - return all necessary fields for status display
        return NextResponse.json({
          found: true,
          data: {
            id: data.id,
            registration_no: data.registration_no,
            student_name: data.student_name,
            parent_name: data.parent_name,
            school: data.school,
            course: data.course,
            branch: data.branch,
            contact_no: data.contact_no,
            personal_email: data.personal_email,
            college_email: data.college_email,
            admission_year: data.admission_year,
            passing_year: data.passing_year,
            status: data.status,
            created_at: data.created_at,
            submitted_at: data.submitted_at,
            approved_at: data.approved_at,
            certificate_url: data.certificate_url,
            reapplication_count: data.reapplication_count,
            student_reply_message: data.student_reply_message,
            alumni_screenshot_url: data.alumni_screenshot_url,
            is_manual_entry: data.is_manual_entry,
            manual_certificate_url: data.manual_certificate_url,
            rejection_reason: data.rejection_reason,
          }
        });

      } catch (attemptError) {
        lastError = attemptError;
        if (attempts >= maxAttempts) {
          throw attemptError;
        }
      }
    }

    // If we get here, all retries failed
    throw lastError;

  } catch (error) {
    console.error('Error in check-status API:', error);

    // Determine error type and return appropriate response
    let errorMessage = 'Failed to fetch status. Please try again.';
    let statusCode = 500;

    if (error.message?.includes('fetch')) {
      errorMessage = 'Network connection error. Please check your internet and try again.';
      statusCode = 503;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
      statusCode = 504;
    } else if (error.code?.startsWith('PGRST')) {
      errorMessage = 'Database query error. Please try again later.';
      statusCode = 503;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        code: error.code || 'UNKNOWN_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    );
  }
}

/**
 * POST /api/student/check-status
 * Alternative endpoint accepting registration_no in request body
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { registration_no } = body;

    if (!registration_no) {
      return NextResponse.json(
        { 
          error: 'Registration number is required',
          code: 'MISSING_REG_NO'
        },
        { status: 400 }
      );
    }

    // Forward to GET handler by constructing URL
    const url = new URL(request.url);
    url.searchParams.set('registration_no', registration_no);
    
    const getRequest = new Request(url.toString(), {
      method: 'GET',
      headers: request.headers,
    });

    return GET(getRequest);

  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json(
      { 
        error: 'Invalid request body',
        code: 'INVALID_REQUEST'
      },
      { status: 400 }
    );
  }
}