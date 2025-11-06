// Note: This is a React Email component that needs to use React Email primitives
// Install: npm install @react-email/components

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export const NoDuesApprovalEmail = ({
  studentName,
  department,
  action,
  status,
  statusDescription
}) => {
  return (
    <Html>
      <Head />
      <Preview>No Dues Status Update for {studentName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>JECRC No Dues Status Update</Heading>
          
          <Section style={section}>
            <Text style={paragraph}>
              Dear {studentName},
            </Text>
            
            <Text style={paragraph}>
              Your no-dues form has been processed by the <strong>{department}</strong> department.
            </Text>
            
            <Text style={paragraph}>
              Status: <strong>{statusDescription}</strong>
            </Text>
            
            {action === 'rejected' && (
              <Text style={paragraph}>
                Please login to the no-dues portal to view the rejection reason and make necessary corrections.
              </Text>
            )}
            
            <Text style={paragraph}>
              Please continue to monitor your application status through the portal.
            </Text>
          </Section>
          
          <Hr style={hr} />
          
          <Section style={footerSection}>
            <Text style={footerText}>
              This is an automated message from JECRC No Dues System.
            </Text>
            <Text style={footerText}>
              Please do not reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles for the email template
const main = {
  backgroundColor: '#000',
  fontFamily: 'Arial, sans-serif',
  padding: '20px 0',
};

const container = {
  backgroundColor: '#1a1a1a',
  margin: '0 auto',
  padding: '20px',
  borderRadius: '8px',
  maxWidth: '600px',
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center',
  color: '#fff',
  marginBottom: '20px',
};

const section = {
  marginBottom: '20px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#fff',
  marginBottom: '16px',
};

const hr = {
  borderColor: '#333',
  margin: '20px 0',
};

const footerSection = {
  marginTop: '20px',
};

const footerText = {
  fontSize: '12px',
  color: '#888',
  textAlign: 'center',
  marginBottom: '4px',
};

export default NoDuesApprovalEmail;