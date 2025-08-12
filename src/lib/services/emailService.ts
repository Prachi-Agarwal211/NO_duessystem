import { EmailPayload, EmailResponse, EmailTemplate, EmailTemplateProps } from '@/types/email'

const API_BASE_URL = '/api/email'

const sendEmail = async <T extends EmailTemplate>(
  payload: EmailPayload<T>
): Promise<EmailResponse> => {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to send email')
    }

    return await response.json()
  } catch (error) {
    console.error('Error sending email:', error)
    throw error instanceof Error 
      ? error 
      : new Error('An unexpected error occurred while sending email')
  }
}

export const emailService = {
  async sendClearanceStatusUpdate(
    to: string | string[],
    props: Omit<EmailTemplateProps['clearance-status-update'], 'appUrl'> & { appUrl?: string }
  ): Promise<EmailResponse> {
    const appUrl = props.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return sendEmail({
      to,
      subject: `Clearance Status Update - ${props.studentName}`,
      template: 'clearance-status-update',
      props: {
        ...props,
        appUrl,
      },
    })
  },

  async sendNewApplicationNotification(
    to: string | string[],
    props: Omit<EmailTemplateProps['new-application'], 'appUrl'> & { appUrl?: string }
  ): Promise<EmailResponse> {
    const appUrl = props.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return sendEmail({
      to,
      subject: 'New No-Dues Application Submitted',
      template: 'new-application',
      props: {
        ...props,
        appUrl,
      },
    })
  },

  async sendReminder(
    to: string | string[],
    props: Omit<EmailTemplateProps['reminder'], 'appUrl'> & { appUrl?: string }
  ): Promise<EmailResponse> {
    const appUrl = props.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return sendEmail({
      to,
      subject: `Reminder: Pending Clearance - ${props.departmentName}`,
      template: 'reminder',
      props: {
        ...props,
        appUrl,
      },
    })
  },
}
