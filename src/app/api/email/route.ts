import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { EmailPayload, ClearanceStatusUpdateProps, NewApplicationProps } from '@/types/email'
import { ClearanceStatusUpdate } from '@/components/emails/ClearanceStatusUpdate'
import { NewApplication } from '@/components/emails/NewApplication'

const resend = new Resend(process.env.RESEND_API_KEY)

type EmailTemplates = {
  'clearance-status-update': ClearanceStatusUpdateProps
  'new-application': NewApplicationProps
}

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

    const payload = (await request.json()) as EmailPayload
    const { to, subject, template, props } = payload

    if (!to || !subject || !template) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Type-safe template rendering
    const renderTemplate = async <T extends keyof EmailTemplates>(
      templateName: T,
      templateProps: EmailTemplates[T]
    ): Promise<string> => {
      switch (templateName) {
        case 'clearance-status-update': {
          const statusProps = templateProps as ClearanceStatusUpdateProps
          const emailComponent = ClearanceStatusUpdate(statusProps)
          return render(emailComponent, { pretty: true })
        }
        case 'new-application': {
          const newAppProps = templateProps as NewApplicationProps
          const emailComponent = NewApplication(newAppProps)
          return render(emailComponent, { pretty: true })
        }
        default:
          throw new Error(`Unsupported template: ${templateName}`)
      }
    }

    // Render the appropriate email template
    const emailHtml = await renderTemplate(template as keyof EmailTemplates, props as any)

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
      { 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
