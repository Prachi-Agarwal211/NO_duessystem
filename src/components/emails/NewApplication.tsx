import { BaseTemplate } from './BaseTemplate'
import { Text, Section, Button } from '@react-email/components'
import { NewApplicationProps } from '@/types/email'

export function NewApplication({
  studentName,
  applicationId,
  appUrl,
}: NewApplicationProps) {
  const previewText = 'Your No-Dues application has been received and is being processed'

  return (
    <BaseTemplate 
      title="New Application Submitted"
      previewText={previewText}
      appUrl={appUrl}
    >
      <Text style={paragraph}>
        Hello {studentName},
      </Text>
      
      <Text style={paragraph}>
        Thank you for submitting your No-Dues application. Your application has been received and is being processed.
      </Text>

      <Section style={{
        backgroundColor: '#F9FAFB', // gray-50
        border: '1px solid #E5E7EB', // gray-200
        borderRadius: '6px',
        padding: '16px',
        margin: '16px 0',
      }}>
        <Text style={{
          fontSize: '14px',
          color: '#6B7280', // gray-500
          margin: '0 0 4px 0',
        }}>
          Application ID
        </Text>
        <Text style={{
          fontFamily: 'monospace',
          fontSize: '18px',
          fontWeight: 600,
          color: '#111827', // gray-900
          margin: 0,
          wordBreak: 'break-all',
        }}>
          {applicationId}
        </Text>
      </Section>

      <Text style={paragraph}>
        You will be notified once your application has been reviewed by all departments.
      </Text>

      <Section style={{
        textAlign: 'center' as const,
        margin: '24px 0',
      }}>
        <Button
          href={`${appUrl}/dashboard`}
          style={button}
        >
          Track Your Application
        </Button>
      </Section>
    </BaseTemplate>
  )
}

// Reusable styles (matching ClearanceStatusUpdate)
const paragraph = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#111827', // gray-900
  margin: '16px 0',
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
