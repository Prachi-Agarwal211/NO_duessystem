export type EmailTemplate = 'clearance-status-update' | 'new-application' | 'reminder'

export interface EmailResponse {
  success: boolean
  data?: any
  error?: string
}

export interface EmailPayload<T extends EmailTemplate> {
  to: string | string[]
  subject: string
  template: T
  props: EmailTemplateProps[T]
}

export interface EmailTemplateProps {
  'clearance-status-update': ClearanceStatusUpdateProps
  'new-application': NewApplicationProps
  'reminder': ReminderProps
}

export interface BaseEmailProps {
  appUrl: string
}

export interface ClearanceStatusUpdateProps extends BaseEmailProps {
  studentName: string
  departmentName: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
}

export interface NewApplicationProps extends BaseEmailProps {
  studentName: string
  applicationId: string
}

export interface ReminderProps extends BaseEmailProps {
  studentName: string
  departmentName: string
  dueDate: string
}

// Extend the global NodeJS namespace for environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      RESEND_API_KEY: string
      EMAIL_FROM: string
      NEXT_PUBLIC_APP_URL: string
    }
  }
}
