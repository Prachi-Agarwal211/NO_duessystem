const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Helper function to read and parse CSV
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || null;
    });
    return obj;
  });
}

// Helper function to convert string to boolean
function toBoolean(str) {
  return str === 'true';
}

// Helper function to convert string to array
function toArray(str) {
  if (!str || str === 'null' || str === '') return [];
  try {
    return JSON.parse(str);
  } catch {
    return str.split(',').map(s => s.trim());
  }
}

// Helper function to parse JSON string
function parseJSON(str) {
  if (!str || str === 'null' || str === '') return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clean existing data (in correct order due to foreign keys)
    console.log('🧹 Cleaning existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.emailLog.deleteMany();
    await prisma.supportTicket.deleteMany();
    await prisma.certificateVerification.deleteMany();
    await prisma.noDuesMessage.deleteMany();
    await prisma.noDuesReapplicationHistory.deleteMany();
    await prisma.studentData.deleteMany();
    await prisma.noDuesStatus.deleteMany();
    await prisma.noDuesForm.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.configReapplicationRule.deleteMany();
    await prisma.configCountryCode.deleteMany();
    await prisma.configValidationRule.deleteMany();
    await prisma.configEmail.deleteMany();
    await prisma.department.deleteMany();
    await prisma.configBranch.deleteMany();
    await prisma.configCourse.deleteMany();
    await prisma.configSchool.deleteMany();

    // 1. Seed Configuration Tables
    console.log('📚 Seeding configuration tables...');

    // Config Schools
    const schoolsData = parseCSV(path.join(__dirname, '../csv/config_schools.csv'));
    for (const school of schoolsData) {
      await prisma.configSchool.create({
        data: {
          id: school.id,
          name: school.name,
          displayOrder: parseInt(school.display_order),
          isActive: toBoolean(school.is_active),
          createdAt: new Date(school.created_at),
          updatedAt: new Date(school.updated_at),
        },
      });
    }
    console.log(`✅ Created ${schoolsData.length} schools`);

    // Config Courses
    const coursesData = parseCSV(path.join(__dirname, '../csv/config_courses.csv'));
    for (const course of coursesData) {
      await prisma.configCourse.create({
        data: {
          id: course.id,
          schoolId: course.school_id,
          name: course.name,
          displayOrder: parseInt(course.display_order),
          isActive: toBoolean(course.is_active),
          createdAt: new Date(course.created_at),
          updatedAt: new Date(course.updated_at),
        },
      });
    }
    console.log(`✅ Created ${coursesData.length} courses`);

    // Config Branches
    const branchesData = parseCSV(path.join(__dirname, '../csv/config_branches.csv'));
    for (const branch of branchesData) {
      await prisma.configBranch.create({
        data: {
          id: branch.id,
          courseId: branch.course_id,
          name: branch.name,
          displayOrder: parseInt(branch.display_order),
          isActive: toBoolean(branch.is_active),
          createdAt: new Date(branch.created_at),
          updatedAt: new Date(branch.updated_at),
        },
      });
    }
    console.log(`✅ Created ${branchesData.length} branches`);

    // Departments
    const departmentsData = parseCSV(path.join(__dirname, '../csv/departments.csv'));
    for (const dept of departmentsData) {
      await prisma.department.create({
        data: {
          id: dept.id,
          name: dept.name,
          displayName: dept.display_name,
          email: dept.email,
          isSchoolSpecific: toBoolean(dept.is_school_specific),
          isActive: toBoolean(dept.is_active),
          displayOrder: parseInt(dept.display_order),
          createdAt: new Date(dept.created_at),
          updatedAt: new Date(dept.updated_at),
        },
      });
    }
    console.log(`✅ Created ${departmentsData.length} departments`);

    // Config Emails
    const emailsData = parseCSV(path.join(__dirname, '../csv/config_emails.csv'));
    for (const email of emailsData) {
      await prisma.configEmail.create({
        data: {
          key: email.key,
          value: email.value,
          description: email.description,
          updatedBy: email.updated_by,
          updatedAt: new Date(email.updated_at),
        },
      });
    }
    console.log(`✅ Created ${emailsData.length} email configs`);

    // Config Validation Rules
    const validationData = parseCSV(path.join(__dirname, '../csv/config_validation_rules.csv'));
    for (const rule of validationData) {
      await prisma.configValidationRule.create({
        data: {
          id: rule.id,
          type: rule.type,
          pattern: rule.pattern,
          message: rule.message,
          isActive: toBoolean(rule.is_active),
          createdAt: new Date(rule.created_at),
        },
      });
    }
    console.log(`✅ Created ${validationData.length} validation rules`);

    // Config Country Codes
    const countryData = parseCSV(path.join(__dirname, '../csv/config_country_codes.csv'));
    for (const country of countryData) {
      await prisma.configCountryCode.create({
        data: {
          id: country.id,
          countryName: country.country_name,
          countryCode: country.country_code,
          dialCode: country.dial_code,
          flagEmoji: country.flag_emoji,
          isActive: toBoolean(country.is_active),
          displayOrder: parseInt(country.display_order),
          createdAt: new Date(country.created_at),
        },
      });
    }
    console.log(`✅ Created ${countryData.length} country codes`);

    // Config Reapplication Rules
    const reappData = parseCSV(path.join(__dirname, '../csv/config_reapplication_rules.csv'));
    for (const rule of reappData) {
      await prisma.configReapplicationRule.create({
        data: {
          id: rule.id,
          ruleType: rule.rule_type,
          value: parseInt(rule.value),
          description: rule.description,
          isActive: toBoolean(rule.is_active),
          createdAt: new Date(rule.created_at),
          updatedAt: new Date(rule.updated_at),
        },
      });
    }
    console.log(`✅ Created ${reappData.length} reapplication rules`);

    // 2. Seed User Profiles
    console.log('👥 Seeding user profiles...');
    const profilesData = parseCSV(path.join(__dirname, '../csv/profiles.csv'));
    for (const profile of profilesData) {
      await prisma.profile.create({
        data: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          registrationNo: profile.registration_no,
          role: profile.role,
          departmentName: profile.department_name,
          assignedDepartmentIds: toArray(profile.assigned_department_ids),
          schoolId: profile.school_id,
          schoolIds: toArray(profile.school_ids),
          courseIds: toArray(profile.course_ids),
          branchIds: toArray(profile.branch_ids),
          isActive: toBoolean(profile.is_active),
          metadata: parseJSON(profile.metadata),
          createdAt: new Date(profile.created_at),
          updatedAt: new Date(profile.updated_at),
        },
      });
    }
    console.log(`✅ Created ${profilesData.length} profiles`);

    // 3. Seed Core Workflow Tables
    console.log('📋 Seeding workflow tables...');

    // No Dues Forms
    const formsData = parseCSV(path.join(__dirname, '../csv/no_dues_forms.csv'));
    for (const form of formsData) {
      await prisma.noDuesForm.create({
        data: {
          id: form.id,
          userId: form.user_id,
          registrationNo: form.registration_no,
          studentName: form.student_name,
          parentName: form.parent_name,
          admissionYear: form.admission_year,
          passingYear: form.passing_year,
          schoolId: form.school_id,
          school: form.school,
          courseId: form.course_id,
          course: form.course,
          branchId: form.branch_id,
          branch: form.branch,
          countryCode: form.country_code,
          contactNo: form.contact_no,
          personalEmail: form.personal_email,
          collegeEmail: form.college_email,
          email: form.email,
          alumniProfileLink: form.alumni_profile_link,
          status: form.status,
          reapplicationOf: form.reapplication_of,
          reapplicationCount: parseInt(form.reapplication_count),
          lastReappliedAt: form.last_reapplied_at ? new Date(form.last_reapplied_at) : null,
          studentReplyMessage: form.student_reply_message,
          isReapplication: toBoolean(form.is_reapplication),
          maxReapplicationsOverride: form.max_reapplications_override ? parseInt(form.max_reapplications_override) : null,
          rejectionContext: parseJSON(form.rejection_context),
          rejectionReason: form.rejection_reason,
          finalCertificateGenerated: toBoolean(form.final_certificate_generated),
          certificateUrl: form.certificate_url,
          blockchainHash: form.blockchain_hash,
          blockchainTx: form.blockchain_tx,
          blockchainBlock: form.blockchain_block ? parseInt(form.blockchain_block) : null,
          blockchainTimestamp: form.blockchain_timestamp ? new Date(form.blockchain_timestamp) : null,
          blockchainVerified: toBoolean(form.blockchain_verified),
          createdAt: new Date(form.created_at),
          updatedAt: new Date(form.updated_at),
        },
      });
    }
    console.log(`✅ Created ${formsData.length} no dues forms`);

    // No Dues Status
    const statusData = parseCSV(path.join(__dirname, '../csv/no_dues_status.csv'));
    for (const status of statusData) {
      await prisma.noDuesStatus.create({
        data: {
          id: status.id,
          formId: status.form_id,
          departmentName: status.department_name,
          status: status.status,
          actionBy: status.action_by,
          actionAt: status.action_at ? new Date(status.action_at) : null,
          remarks: status.remarks,
          studentReplyMessage: status.student_reply_message,
          createdAt: new Date(status.created_at),
          updatedAt: new Date(status.updated_at),
        },
      });
    }
    console.log(`✅ Created ${statusData.length} status records`);

    // Student Data
    const studentData = parseCSV(path.join(__dirname, '../csv/student_data.csv'));
    for (const student of studentData) {
      await prisma.studentData.create({
        data: {
          id: student.id,
          formId: student.form_id,
          registrationNo: student.registration_no,
          studentName: student.student_name,
          parentName: student.parent_name,
          school: student.school,
          course: student.course,
          branch: student.branch,
          contactNo: student.contact_no,
          personalEmail: student.personal_email,
          collegeEmail: student.college_email,
          admissionYear: student.admission_year,
          passingYear: student.passing_year,
          updatedAt: new Date(student.updated_at),
          updatedBy: student.updated_by,
        },
      });
    }
    console.log(`✅ Created ${studentData.length} student records`);

    // No Dues Messages
    const messagesData = parseCSV(path.join(__dirname, '../csv/no_dues_messages.csv'));
    for (const message of messagesData) {
      await prisma.noDuesMessage.create({
        data: {
          id: message.id,
          formId: message.form_id,
          departmentName: message.department_name,
          message: message.message,
          senderType: message.sender_type,
          senderName: message.sender_name,
          senderId: message.sender_id,
          createdAt: new Date(message.created_at),
          isRead: toBoolean(message.is_read),
        },
      });
    }
    console.log(`✅ Created ${messagesData.length} messages`);

    // Support Tickets
    const ticketsData = parseCSV(path.join(__dirname, '../csv/support_tickets.csv'));
    for (const ticket of ticketsData) {
      await prisma.supportTicket.create({
        data: {
          id: ticket.id,
          ticketId: ticket.ticket_id,
          formId: ticket.form_id,
          registrationNo: ticket.registration_no,
          studentName: ticket.student_name,
          userEmail: ticket.user_email || 'support@jecrcu.edu.in',
          requesterType: ticket.requester_type,
          subject: ticket.subject,
          message: ticket.message,
          status: ticket.status,
          priority: ticket.priority,
          assignedTo: ticket.assigned_to,
          isRead: toBoolean(ticket.is_read),
          readAt: ticket.read_at ? new Date(ticket.read_at) : null,
          createdAt: new Date(ticket.created_at),
          updatedAt: new Date(ticket.updated_at),
          resolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at) : null,
          resolvedBy: ticket.resolved_by,
        },
      });
    }
    console.log(`✅ Created ${ticketsData.length} support tickets`);

    // Email Logs
    const emailLogsData = parseCSV(path.join(__dirname, '../csv/email_logs.csv'));
    for (const log of emailLogsData) {
      await prisma.emailLog.create({
        data: {
          id: log.id,
          emailType: log.email_type,
          recipientEmail: log.recipient_email,
          subject: log.subject,
          body: log.body,
          status: log.status,
          errorMessage: log.error_message,
          sentAt: log.sent_at ? new Date(log.sent_at) : null,
          createdAt: new Date(log.created_at),
          updatedAt: new Date(log.updated_at),
        },
      });
    }
    console.log(`✅ Created ${emailLogsData.length} email logs`);

    // Certificate Verifications
    const verificationsData = parseCSV(path.join(__dirname, '../csv/certificate_verifications.csv'));
    for (const verification of verificationsData) {
      await prisma.certificateVerification.create({
        data: {
          id: verification.id,
          formId: verification.form_id,
          transactionId: verification.transaction_id,
          verificationResult: verification.verification_result,
          tamperedFields: parseJSON(verification.tampered_fields),
          verifiedByIp: verification.verified_by_ip,
          verifiedAt: new Date(verification.verified_at),
          createdAt: new Date(verification.created_at),
          updatedAt: new Date(verification.updated_at),
        },
      });
    }
    console.log(`✅ Created ${verificationsData.length} certificate verifications`);

    // Audit Logs
    const auditData = parseCSV(path.join(__dirname, '../csv/audit_logs.csv'));
    for (const audit of auditData) {
      await prisma.auditLog.create({
        data: {
          id: audit.id,
          action: audit.action,
          actorId: audit.actor_id,
          actorName: audit.actor_name,
          actorRole: audit.actor_role,
          targetId: audit.target_id,
          targetType: audit.target_type,
          oldValues: parseJSON(audit.old_values),
          newValues: parseJSON(audit.new_values),
          ipAddress: audit.ip_address,
          userAgent: audit.user_agent,
          createdAt: new Date(audit.created_at),
        },
      });
    }
    console.log(`✅ Created ${auditData.length} audit logs`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Schools: ${schoolsData.length}`);
    console.log(`- Courses: ${coursesData.length}`);
    console.log(`- Branches: ${branchesData.length}`);
    console.log(`- Departments: ${departmentsData.length}`);
    console.log(`- Profiles: ${profilesData.length}`);
    console.log(`- No Dues Forms: ${formsData.length}`);
    console.log(`- Status Records: ${statusData.length}`);
    console.log(`- Messages: ${messagesData.length}`);
    console.log(`- Support Tickets: ${ticketsData.length}`);
    console.log(`- Email Logs: ${emailLogsData.length}`);
    console.log(`- Certificate Verifications: ${verificationsData.length}`);
    console.log(`- Audit Logs: ${auditData.length}`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
