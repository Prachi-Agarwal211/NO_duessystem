import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewApplicationEmail } from '@/lib/email'

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

    const { studentEmail, studentName, applicationId } = await request.json()

    if (!studentEmail || !studentName || !applicationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Send the email
    const { success, error } = await sendNewApplicationEmail(
      studentEmail,
      studentName,
      applicationId
    )

    if (!success) {
      console.error('Failed to send new application email:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending new application email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { POST }
