import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'
import { convocationValidateSchema, validateWithZod } from '@/lib/zodSchemas'
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter'

/**
 * POST /api/convocation/validate
 * Validates if a registration number is eligible for convocation
 *
 * Request body: { registration_no: string }
 *
 * Response:
 * - 200: { valid: true, student: { name, school, admission_year } }
 * - 404: { valid: false, error: "Registration number not found" }
 * - 400: { valid: false, error: "Registration number is required" }
 */
export async function POST(request) {
  try {
    // Rate limiting: Prevent enumeration attacks
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.READ)
    if (!rateLimitCheck.success) {
      return NextResponse.json(
        {
          valid: false,
          error: rateLimitCheck.error || 'Too many requests',
          retryAfter: rateLimitCheck.retryAfter
        },
        { status: 429 }
      )
    }

    const body = await request.json()

    // ==================== ZOD VALIDATION ====================
    // Validates, trims, and uppercases registration number
    const validation = validateWithZod(body, convocationValidateSchema)

    if (!validation.success) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.errors.registration_no || 'Invalid registration number'
        },
        { status: 400 }
      )
    }

    // Registration number is already normalized by Zod
    const normalizedRegNo = validation.data.registration_no

    // Query the convocation_eligible_students table
    const { data: student, error } = await supabaseAdmin
      .from('convocation_eligible_students')
      .select('student_name, school, admission_year, status')
      .eq('registration_no', normalizedRegNo)
      .single()

    if (error) {
      // If no student found, return not eligible
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            valid: false,
            error: 'Registration number not eligible for convocation'
          },
          { status: 404 }
        )
      }

      // Database error
      console.error('Database error:', error)
      return NextResponse.json(
        {
          valid: false,
          error: 'Database error occurred'
        },
        { status: 500 }
      )
    }

    // Student is eligible - return their details
    return NextResponse.json({
      valid: true,
      student: {
        name: student.student_name,
        school: student.school,
        admission_year: student.admission_year,
        status: student.status,
        registration_no: normalizedRegNo
      }
    })

  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      {
        valid: false,
        error: 'Server error occurred'
      },
      { status: 500 }
    )
  }
}