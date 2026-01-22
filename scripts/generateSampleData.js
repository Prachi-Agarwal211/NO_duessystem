/**
 * Sample Data Generator
 * Creates 50 sample records for each table with realistic data
 */

const { PrismaClient } = require('@prisma/client');
const faker = require('faker');

const prisma = new PrismaClient();

// Sample data pools
const firstNames = ['Rahul', 'Priya', 'Amit', 'Neha', 'Vikram', 'Anjali', 'Rohit', 'Kavita', 'Arjun', 'Meera', 'Karan', 'Sneha', 'Aditya', 'Pooja', 'Raj', 'Simran', 'Vivek', 'Divya', 'Manish', 'Swati'];
const lastNames = ['Sharma', 'Patel', 'Singh', 'Gupta', 'Kumar', 'Verma', 'Reddy', 'Jain', 'Agarwal', 'Mishra', 'Yadav', 'Choudhary', 'Nair', 'Iyer', 'Menon', 'Pillai', 'Rao', 'Shetty', 'Pillai', 'Nambiar'];
const schools = ['School of Engineering', 'School of Management', 'School of Computer Science'];
const courses = {
  'School of Engineering': ['Computer Science Engineering', 'Information Technology', 'Electronics & Communication', 'Mechanical Engineering', 'Civil Engineering'],
  'School of Management': ['Business Administration', 'MBA', 'BBA'],
  'School of Computer Science': ['Data Science', 'Artificial Intelligence', 'Cybersecurity', 'Software Engineering']
};
const branches = {
  'Computer Science Engineering': ['Computer Science', 'Artificial Intelligence', 'Data Science', 'Machine Learning'],
  'Information Technology': ['Information Technology', 'Network Security', 'Cloud Computing'],
  'Electronics & Communication': ['Electronics', 'Communication', 'VLSI Design'],
  'Mechanical Engineering': ['Mechanical', 'Automobile', 'Production'],
  'Civil Engineering': ['Civil', 'Construction', 'Structural'],
  'Business Administration': ['Finance', 'Marketing', 'HR', 'Operations'],
  'Data Science': ['Data Analytics', 'Big Data', 'Business Intelligence'],
  'Artificial Intelligence': ['AI Research', 'Deep Learning', 'Robotics']
};

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRegistrationNo() {
  const year = 20 + Math.floor(Math.random() * 6); // 2020-2025
  const branch = getRandomElement(['BCE', 'BCS', 'BIT', 'BME', 'BCE', 'BBA', 'BDA', 'BAI']);
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${year}${branch}${number}`;
}

function generateEmail(name, domain) {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  const randomNum = Math.floor(Math.random() * 1000);
  return `${cleanName}${randomNum}@${domain}`;
}

function generatePhoneNumber() {
  return `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

function generateAdmissionYear() {
  return 2018 + Math.floor(Math.random() * 6); // 2018-2023
}

function generatePassingYear() {
  return 2022 + Math.floor(Math.random() * 4); // 2022-2025
}

async function generateSampleStudents(count = 50) {
  console.log(`🎓 Generating ${count} sample students...`);
  
  const students = [];
  const statuses = ['pending', 'in_progress', 'completed', 'rejected'];
  const statusWeights = [0.3, 0.4, 0.2, 0.1]; // 30% pending, 40% in progress, 20% completed, 10% rejected
  
  for (let i = 0; i < count; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const fullName = `${firstName} ${lastName}`;
    const parentName = `${getRandomElement(firstNames)} ${lastName}`;
    const registrationNo = generateRegistrationNo();
    
    const school = getRandomElement(schools);
    const course = getRandomElement(courses[school]);
    const branch = getRandomElement(branches[course] || [course]);
    
    const admissionYear = generateAdmissionYear();
    const passingYear = generatePassingYear();
    
    const personalEmail = generateEmail(fullName, 'gmail.com');
    const collegeEmail = generateEmail(fullName.toLowerCase().replace(/\s+/g, ''), 'jecrcu.edu.in');
    
    const status = getRandomWeighted(statuses, statusWeights);
    
    const student = {
      id: `sample-student-${i + 1}`,
      registration_no: registrationNo,
      student_name: fullName,
      parent_name: parentName,
      school: school,
      course: course,
      branch: branch,
      country_code: '+91',
      contact_no: generatePhoneNumber(),
      personal_email: personalEmail,
      college_email: collegeEmail,
      email: collegeEmail,
      alumni_profile_link: `https://jualumni.in/profile/${registrationNo.toLowerCase()}`,
      status: status,
      admission_year: admissionYear.toString(),
      passing_year: passingYear.toString(),
      created_at: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
      updated_at: new Date().toISOString()
    };
    
    students.push(student);
  }
  
  return students;
}

function getRandomWeighted(items, weights) {
  const random = Math.random();
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += weights[i];
    if (random < sum) return items[i];
  }
  return items[items.length - 1];
}

async function generateDepartmentStatuses(students) {
  console.log('📊 Generating department statuses...');
  
  const departments = ['school_hod', 'library', 'accounts', 'hostel', 'sports', 'placement', 'exam', 'it_support'];
  const statuses = ['pending', 'approved', 'rejected'];
  const remarks = [
    'Documents verified',
    'Clearance pending',
    'Requirements met',
    'Additional documents needed',
    'Approved with conditions',
    'Rejected - incomplete documentation'
  ];
  
  const statusRecords = [];
  
  for (const student of students) {
    for (const dept of departments) {
      const status = student.status === 'completed' ? 'approved' : 
                    student.status === 'rejected' ? 'rejected' : 
                    getRandomWeighted(statuses, [0.6, 0.3, 0.1]);
      
      const record = {
        id: `status-${student.id}-${dept}`,
        form_id: student.id,
        department_name: dept,
        status: status,
        action_by: status === 'approved' ? `${dept}@jecrcu.edu.in` : null,
        action_at: status !== 'pending' ? new Date().toISOString() : null,
        remarks: status !== 'pending' ? getRandomElement(remarks) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      statusRecords.push(record);
    }
  }
  
  return statusRecords;
}

async function generateSupportTickets(count = 50) {
  console.log(`🎫 Generating ${count} support tickets...`);
  
  const tickets = [];
  const requesterTypes = ['student', 'department'];
  const priorities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['open', 'in_progress', 'closed', 'resolved'];
  
  const subjects = [
    'Application not submitted',
    'Certificate generation issue',
    'Login problem',
    'Document upload failed',
    'Department clearance delay',
    'Email not received',
    'Status update needed',
    'Account access issue',
    'Payment verification',
    'Technical support needed'
  ];
  
  for (let i = 0; i < count; i++) {
    const ticket = {
      id: `ticket-${i + 1}`,
      ticket_id: `TICKET${String(i + 1).padStart(3, '0')}`,
      registration_no: generateRegistrationNo(),
      student_name: `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`,
      user_email: generateEmail('user', 'example.com'),
      requester_type: getRandomElement(requesterTypes),
      subject: getRandomElement(subjects),
      message: `This is a sample support ticket message for ${getRandomElement(subjects).toLowerCase()}. The user is experiencing issues with the system and needs assistance.`,
      status: getRandomWeighted(statuses, [0.4, 0.3, 0.2, 0.1]),
      priority: getRandomWeighted(priorities, [0.3, 0.4, 0.2, 0.1]),
      assigned_to: getRandomElement(['library@jecrcu.edu.in', 'accounts@jecrcu.edu.in', 'it@jecrcu.edu.in', 'admin@jecrcu.edu.in']),
      is_read: Math.random() > 0.7,
      created_at: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: Math.random() > 0.7 ? new Date().toISOString() : null,
      resolved_by: Math.random() > 0.7 ? getRandomElement(['admin@jecrcu.edu.in', 'support@jecrcu.edu.in']) : null
    };
    
    tickets.push(ticket);
  }
  
  return tickets;
}

async function generateEmailLogs(count = 50) {
  console.log(`📧 Generating ${count} email logs...`);
  
  const logs = [];
  const emailTypes = ['student_notification', 'department_notification', 'certificate_generated', 'rejection_notification', 'status_update'];
  const statuses = ['sent', 'failed', 'pending'];
  const subjects = [
    'Application Status Update',
    'Certificate Generated',
    'Application Rejected',
    'Department Notification',
    'Reapplication Confirmation'
  ];
  
  for (let i = 0; i < count; i++) {
    const status = getRandomWeighted(statuses, [0.8, 0.15, 0.05]);
    
    const log = {
      id: `email-${i + 1}`,
      email_type: getRandomElement(emailTypes),
      recipient_email: generateEmail('recipient', 'example.com'),
      subject: getRandomElement(subjects),
      body: `This is a sample email body for ${getRandomElement(subjects).toLowerCase()}.`,
      status: status,
      error_message: status === 'failed' ? 'SMTP connection timeout' : null,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      created_at: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
      updated_at: new Date().toISOString()
    };
    
    logs.push(log);
  }
  
  return logs;
}

async function generateAuditLogs(count = 50) {
  console.log(`📋 Generating ${count} audit logs...`);
  
  const logs = [];
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT'];
  const entityTypes = ['no_dues_form', 'profile', 'department', 'certificate', 'support_ticket'];
  
  for (let i = 0; i < count; i++) {
    const log = {
      id: `audit-${i + 1}`,
      user_id: `user-${Math.floor(Math.random() * 10) + 1}`,
      action: getRandomElement(actions),
      entity_type: getRandomElement(entityTypes),
      entity_id: `entity-${Math.floor(Math.random() * 100) + 1}`,
      old_values: Math.random() > 0.5 ? JSON.stringify({ status: 'pending' }) : null,
      new_values: JSON.stringify({ status: getRandomElement(['approved', 'rejected', 'completed']) }),
      ip_address: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      user_agent: 'Mozilla/5.0 (Sample Browser)',
      created_at: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString()
    };
    
    logs.push(log);
  }
  
  return logs;
}

async function generateCertificates(count = 25) {
  console.log(`🏆 Generating ${count} certificates...`);
  
  const certificates = [];
  
  for (let i = 0; i < count; i++) {
    const cert = {
      id: `cert-${i + 1}`,
      form_id: `sample-student-${Math.floor(Math.random() * 50) + 1}`,
      certificate_url: `https://jecrcu.edu.in/certificates/cert-${i + 1}.pdf`,
      blockchain_hash: `0x${Math.random().toString(36).substring(2, 66)}`,
      blockchain_tx: `0x${Math.random().toString(36).substring(2, 66)}`,
      blockchain_block: Math.floor(Math.random() * 1000000) + 1000000,
      blockchain_timestamp: new Date().toISOString(),
      blockchain_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    certificates.push(cert);
  }
  
  return certificates;
}

async function main() {
  try {
    console.log('🚀 Starting sample data generation...');
    
    // Generate sample students
    const students = await generateSampleStudents(50);
    console.log(`✅ Generated ${students.length} students`);
    
    // Generate department statuses
    const departmentStatuses = await generateDepartmentStatuses(students);
    console.log(`✅ Generated ${departmentStatuses.length} department statuses`);
    
    // Generate support tickets
    const supportTickets = await generateSupportTickets(50);
    console.log(`✅ Generated ${supportTickets.length} support tickets`);
    
    // Generate email logs
    const emailLogs = await generateEmailLogs(50);
    console.log(`✅ Generated ${emailLogs.length} email logs`);
    
    // Generate audit logs
    const auditLogs = await generateAuditLogs(50);
    console.log(`✅ Generated ${auditLogs.length} audit logs`);
    
    // Generate certificates
    const certificates = await generateCertificates(25);
    console.log(`✅ Generated ${certificates.length} certificates`);
    
    // Write to CSV files
    const fs = require('fs');
    const path = require('path');
    
    const csvDir = path.join(__dirname, '../csv/sample_data');
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true });
    }
    
    // Helper function to write CSV
    function writeCSV(filename, data) {
      if (data.length === 0) return;
      
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');
      
      fs.writeFileSync(path.join(csvDir, filename), csvContent, 'utf8');
      console.log(`📄 Wrote ${filename} with ${data.length} records`);
    }
    
    // Write all CSV files
    writeCSV('sample_no_dues_forms.csv', students);
    writeCSV('sample_no_dues_status.csv', departmentStatuses);
    writeCSV('sample_support_tickets.csv', supportTickets);
    writeCSV('sample_email_logs.csv', emailLogs);
    writeCSV('sample_audit_logs.csv', auditLogs);
    writeCSV('sample_certificates.csv', certificates);
    
    console.log('\n🎉 Sample data generation complete!');
    console.log(`📁 Files saved to: ${csvDir}`);
    console.log('\n📊 Summary:');
    console.log(`  - Students: ${students.length}`);
    console.log(`  - Department Statuses: ${departmentStatuses.length}`);
    console.log(`  - Support Tickets: ${supportTickets.length}`);
    console.log(`  - Email Logs: ${emailLogs.length}`);
    console.log(`  - Audit Logs: ${auditLogs.length}`);
    console.log(`  - Certificates: ${certificates.length}`);
    
  } catch (error) {
    console.error('❌ Error generating sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
