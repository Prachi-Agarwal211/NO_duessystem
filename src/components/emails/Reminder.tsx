import { BaseTemplate } from './BaseTemplate'
import { Text, Section, Button } from '@react-email/components'
import { ReminderProps } from '@/types/email'

export function Reminder({
  studentName,
  departmentName,
  dueDate,
  appUrl,
}: ReminderProps) {
  const previewText = `Reminder: Pending clearance from ${departmentName}`

  return (
    <BaseTemplate 
      title="Reminder: Pending Clearance"
      previewText={previewText}
      appUrl={appUrl}
    >
      <Text style={paragraph}>
        Hello {studentName},
      </Text>
      
      <Text style={paragraph}>
        This is a friendly reminder that your clearance from the <strong>{departmentName}</strong> is still pending.
      </Text>

      <Section style={highlight}>
        <Text style={highlightText}>
          Due Date: {new Date(dueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </Section>

      <Text style={paragraph}>
        Please complete the necessary steps to finalize your clearance at your earliest convenience to avoid any delays in your application process.
      </Text>

      <Section style={buttonContainer}>
        <Button
          href={`${appUrl}/dashboard`}
          style={button}
        >
          Complete Clearance
        </Button>
      </Section>

      <Text style={footerText}>
        If you've already completed the clearance process, please ignore this reminder.
      </Text>
    </BaseTemplate>
  )
}

// Reusable styles
const paragraph = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#111827', // gray-900
  margin: '16px 0',
}

const highlight = {
  backgroundColor: '#FEF3C7', // yellow-50
  borderLeft: '4px solid #F59E0B', // yellow-500
  padding: '16px',
  margin: '24px 0',
  borderRadius: '0 4px 4px 0',
}

const highlightText = {
  ...paragraph,
  color: '#92400E', // yellow-900
  margin: 0,
  fontWeight: 500,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563EB', // blue-600
  color: '#FFFFFF',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: 500,
  display: 'inline-block',
}

const footerText = {
  ...paragraph,
  color: '#6B7280', // gray-500
  fontSize: '14px',
  margin: '24px 0 0 0',
}
