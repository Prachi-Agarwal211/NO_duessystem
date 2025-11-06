// Note: This is a React Email component that needs to use React Email primitives
// Install: npm install @react-email/components

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export const NoDuesSubmissionEmail = ({
  studentName,
  registrationNo,
  formId
}) => {
  const approvalUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/staff/student/${formId}`;
  
  return (
    <Html>
      <Head />
      <Preview>New No Dues Application from {studentName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New No Dues Application</Heading>
          
          <Section style={section}>
            <Text style={paragraph}>
              Dear Department Staff,
            </Text>
            
            <Text style={paragraph}>
              A new no-dues application has been submitted by:
            </Text>
            
            <Text style={detailText}>
              <strong>Student Name:</strong> {studentName}
            </Text>
            
            <Text style={detailText}>
              <strong>Registration No:</strong> {registrationNo}
            </Text>
            
            <Text style={paragraph}>
              Please review the application and take the necessary action.
            </Text>
            
            <Button style={button} href={approvalUrl}>
              Review Application
            </Button>
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

const detailText = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#fff',
  marginBottom: '8px',
  paddingLeft: '10px',
};

const button = {
  backgroundColor: '#3b82f6',
  color: '#fff',
  padding: '12px 20px',
  textDecoration: 'none',
  borderRadius: '4px',
  display: 'inline-block',
  margin: '10px 0',
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

export default NoDuesSubmissionEmail;