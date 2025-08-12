import { Head, Html, Body, Container, Section, Text, Link } from '@react-email/components'
import * as React from 'react'

interface EmailTemplateProps {
  children: React.ReactNode
  title: string
  previewText: string
  appUrl?: string
}

export function BaseTemplate({
  children,
  title,
  previewText,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}: EmailTemplateProps) {
  const currentYear = new Date().getFullYear()

  return (
    <Html>
      <Head>
        <title>{title}</title>
      </Head>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={heading}>JECRC No-Dues System</Text>
            <Text style={previewTextStyle}>{previewText}</Text>
          </Section>
          
          <Section style={content}>
            {children}
          </Section>
          
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated message. Please do not reply to this email.
            </Text>
            <Text style={footerText}>
              © {currentYear} JECRC University. All rights reserved.
            </Text>
            <Text style={{ ...footerText, marginTop: '8px' }}>
              <Link 
                href={`${appUrl}/unsubscribe`} 
                style={unsubscribeLink}
              >
                Unsubscribe from emails
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Email styles
const body = {
  backgroundColor: '#f3f4f6',
  fontFamily: 'Arial, sans-serif',
  margin: 0,
  padding: '20px 0',
}

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  padding: '24px',
}

const header = {
  textAlign: 'center' as const,
  marginBottom: '24px',
  paddingBottom: '16px',
  borderBottom: '1px solid #e5e7eb',
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#111827',
  margin: '0 0 8px 0',
}

const previewTextStyle = {
  fontSize: '14px',
  color: '#6b7280',
  margin: 0,
}

const content = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '24px',
  marginBottom: '24px',
}

const footer = {
  textAlign: 'center' as const,
  fontSize: '12px',
  color: '#6b7280',
  borderTop: '1px solid #e5e7eb',
  paddingTop: '16px',
}

const footerText = {
  margin: '0 0 8px 0',
  lineHeight: '1.5',
}

const unsubscribeLink = {
  color: '#4f46e5',
  textDecoration: 'underline',
}
