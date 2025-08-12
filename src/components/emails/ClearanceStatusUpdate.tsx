import { BaseTemplate } from './BaseTemplate'
import { Text, Section, Button } from '@react-email/components'
import { ClearanceStatusUpdateProps } from '@/types/email'

export function ClearanceStatusUpdate({
  studentName,
  departmentName,
  status,
  notes,
  appUrl,
}: ClearanceStatusUpdateProps) {
  const statusLabels = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
  }

  const statusColors = {
    pending: '#F59E0B', // yellow-500
    approved: '#10B981', // emerald-500
    rejected: '#EF4444', // red-500
  }

  const statusText = statusLabels[status] || status
  const statusColor = statusColors[status] || '#6B7280'
  const previewText = `Your clearance status for ${departmentName} has been updated to ${statusText}`

  return (
    <BaseTemplate 
      title="Clearance Status Update"
      previewText={previewText}
      appUrl={appUrl}
    >
      <Text style={paragraph}>
        Hello {studentName},
      </Text>
      
      <Text style={paragraph}>
        The status of your clearance request for <strong>{departmentName}</strong> has been updated to:
      </Text>

      <Section style={{
        backgroundColor: `${statusColor}20`,
        borderRadius: '6px',
        padding: '16px',
        margin: '16px 0',
      }}>
        <Text style={{
          ...heading,
          color: statusColor,
          fontSize: '18px',
          margin: 0,
        }}>
          {statusText}
        </Text>
        
        {notes && (
          <Text style={{
            ...paragraph,
            margin: '8px 0 0 0',
            color: '#374151', // gray-700
          }}>
            <strong>Note:</strong> {notes}
          </Text>
        )}
      </Section>

      <Section style={{
        textAlign: 'center' as const,
        margin: '24px 0',
      }}>
        <Button
          href={`${appUrl}/dashboard`}
          style={button}
        >
          View Your Dashboard
        </Button>
      </Section>

      <Text style={{
        ...paragraph,
        color: '#6B7280', // gray-500
        fontSize: '14px',
        margin: '24px 0 0 0',
      }}>
        If you have any questions, please contact the {departmentName} department directly.
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

const heading = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#111827', // gray-900
  margin: '0 0 8px 0',
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
