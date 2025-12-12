import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/convocation/stats
 * Retrieves statistics for convocation dashboard
 * 
 * Response:
 * {
 *   total: number,
 *   statusCounts: {
 *     not_started: number,
 *     pending_online: number,
 *     pending_manual: number,
 *     completed_online: number,
 *     completed_manual: number
 *   },
 *   schoolCounts: { [school: string]: number },
 *   completionRate: number
 * }
 */
export async function GET(request) {
  try {
    const supabase = await createClient()

    // Get total count
    const { count: total, error: totalError } = await supabase
      .from('convocation_eligible_students')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.error('Total count error:', totalError)
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      )
    }

    // Get status counts
    const { data: statusData, error: statusError } = await supabase
      .from('convocation_eligible_students')
      .select('status')

    if (statusError) {
      console.error('Status count error:', statusError)
      return NextResponse.json(
        { error: 'Failed to fetch status statistics' },
        { status: 500 }
      )
    }

    // Calculate status counts
    const statusCounts = {
      not_started: 0,
      pending_online: 0,
      pending_manual: 0,
      completed_online: 0,
      completed_manual: 0
    }

    statusData.forEach(record => {
      if (statusCounts.hasOwnProperty(record.status)) {
        statusCounts[record.status]++
      }
    })

    // Get school counts
    const { data: schoolData, error: schoolError } = await supabase
      .from('convocation_eligible_students')
      .select('school')

    if (schoolError) {
      console.error('School count error:', schoolError)
      return NextResponse.json(
        { error: 'Failed to fetch school statistics' },
        { status: 500 }
      )
    }

    // Calculate school counts
    const schoolCounts = {}
    schoolData.forEach(record => {
      schoolCounts[record.school] = (schoolCounts[record.school] || 0) + 1
    })

    // Calculate completion rate
    const completedCount = statusCounts.completed_online + statusCounts.completed_manual
    const completionRate = total > 0 ? ((completedCount / total) * 100).toFixed(2) : 0

    return NextResponse.json({
      total: total || 0,
      statusCounts,
      schoolCounts,
      completionRate: parseFloat(completionRate),
      completedCount,
      pendingCount: statusCounts.pending_online + statusCounts.pending_manual,
      notStartedCount: statusCounts.not_started
    })

  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Server error occurred' },
      { status: 500 }
    )
  }
}