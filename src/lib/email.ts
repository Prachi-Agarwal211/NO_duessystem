import { Resend } from 'resend'
import { render } from '@react-email/render'
import { ClearanceStatus } from '@/types'
import { ClearanceStatusUpdate } from '@/components/emails/ClearanceStatusUpdate'
import { NewApplication } from '@/components/emails/NewApplication'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailOptions {
  to: string
  subject: string
  react: React.ReactElement
}

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  try {
    const html = render(react)
    const from = process.env.EMAIL_FROM || 'no-reply@jecrc.edu.in'
    
    // In development, log the email instead of sending it
    if (process.env.NODE_ENV === 'development') {
      console.log('=== EMAIL NOTIFICATION ===')
      console.log('To:', to)
      console.log('Subject:', subject)
      console.log('Preview:', html)
      return { success: true, data: { id: 'mocked-email-id' } }
    }
    
    const { data, error } = await resend.emails.send({
      from: `JECRC No-Dues System <${from}>`,
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error('Error sending email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error }
  }
}

export async function sendClearanceStatusUpdateEmail(
  to: string,
  studentName: string,
  departmentName: string,
  status: ClearanceStatus['status'],
  notes?: string | null
) {
  const subject = `Your clearance status has been ${status}`
  
  return sendEmail({
    to,
    subject,
    react: (
      <ClearanceStatusUpdate 
        studentName={studentName}
        departmentName={departmentName}
        status={status}
        notes={notes}
      />
    )
  })
}

export async function sendNewApplicationEmail(
  to: string,
  studentName: string,
  applicationId: string
) {
  const subject = `New No-Dues Application Submitted`
  
  return sendEmail({
    to,
    subject,
    react: (
      <NewApplication 
        studentName={studentName}
        applicationId={applicationId}
      />
    )
  })
}

// Add this function to send reminders for pending actions
export async function sendReminderEmail(
  to: string,
  studentName: string,
  departmentName: string,
  dueDate: string
) {
  const subject = `Reminder: Pending Clearance Action Required`
  
  return sendEmail({
    to,
    subject,
    react: (
      <BaseTemplate 
        title="Reminder: Pending Action Required"
        previewText={`Action required for ${departmentName} clearance`}
      >
        <div className="text-center">
          <p className="text-gray-700 mb-2">Hello {studentName},</p>
          <p className="text-gray-700 mb-4">
            This is a friendly reminder that your action is required for the <strong>{departmentName}</strong> clearance.
          </p>
          <p className="text-gray-700 mb-4">
            Please complete the required steps by <strong>{new Date(dueDate).toLocaleDateString()}</strong> to avoid any delays in your clearance process.
          </p>
          
          <div className="mt-6">
            <a 
              href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Complete Required Actions
            </a>
          </div>
        </div>
      </BaseTemplate>
    )
  })
}
