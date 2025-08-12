import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { EmailPayload } from '@/types/email'
import ClearanceStatusUpdate from '@/components/emails/ClearanceStatusUpdate'
import NewApplication from '@/components/emails/NewApplication'

const resend = new Resend(process.env.RESEND_API_KEY)

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

    const { to, subject, template, props } = await request.json() as EmailPayload

    if (!to || !subject || !template) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Render the appropriate email template
    let emailHtml = ''
    switch (template) {
      case 'clearance-status-update':
        emailHtml = render(ClearanceStatusUpdate(props))
        break
      case 'new-application':
        emailHtml = render(NewApplication(props))
        break
      default:
        return NextResponse.json(
          { error: 'Invalid template' },
          { status: 400 }
        )
    }

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'no-reply@jecrc.edu.in',
      to,
      subject,
      html: emailHtml,
    })

    if (error) {
      console.error('Error sending email:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in email API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { POST }
