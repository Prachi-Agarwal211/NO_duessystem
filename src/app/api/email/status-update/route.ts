import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendClearanceStatusUpdateEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has permission to send status updates
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'approver' && profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { studentEmail, studentName, departmentName, status, notes } = await request.json()

    if (!studentEmail || !studentName || !departmentName || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Send the email
    const { success, error } = await sendClearanceStatusUpdateEmail(
      studentEmail,
      studentName,
      departmentName,
      status,
      notes
    )

    if (!success) {
      console.error('Failed to send status update email:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending status update email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { POST }
