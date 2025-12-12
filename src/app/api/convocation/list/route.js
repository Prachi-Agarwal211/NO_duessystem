import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/convocation/list
 * Retrieves paginated list of convocation-eligible students with filtering
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - status: convocation_status filter (optional)
 * - school: school name filter (optional)
 * - search: search by name or registration number (optional)
 *
 * Response:
 * {
 *   students: Array<Student>,
 *   pagination: { page, limit, total, totalPages }
 * }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit

    // Parse filter params
    const statusFilter = searchParams.get('status')
    const schoolFilter = searchParams.get('school')
    const searchQuery = searchParams.get('search')?.trim()

    // Build query
    let query = supabaseAdmin
      .from('convocation_eligible_students')
      .select('*', { count: 'exact' })

    // Apply filters
    if (statusFilter && ['not_started', 'pending_online', 'pending_manual', 'completed_online', 'completed_manual'].includes(statusFilter)) {
      query = query.eq('status', statusFilter)
    }

    if (schoolFilter) {
      query = query.eq('school', schoolFilter)
    }

    if (searchQuery) {
      // Search in both name and registration number
      query = query.or(`student_name.ilike.%${searchQuery}%,registration_no.ilike.%${searchQuery}%`)
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: students, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      students: students || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })

  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json(
      { error: 'Server error occurred' },
      { status: 500 }
    )
  }
}