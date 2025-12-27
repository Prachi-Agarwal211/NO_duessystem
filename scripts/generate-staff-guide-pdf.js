const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create PDF document
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  bufferPages: true
});

const outputPath = path.join(__dirname, '..', 'JECRC-No-Dues-Staff-Guide.pdf');
const imagesDir = path.join(__dirname, '..', 'no dues');
const logoPath = path.join(__dirname, '..', 'public', 'assets', 'logo light.png');

doc.pipe(fs.createWriteStream(outputPath));

const CONTENT_WIDTH = doc.page.width - 100;

// Helper to check space
function needsNewPage(space) {
  return (doc.page.height - doc.y - 50) < space;
}

// Add section title
function addTitle(text, size = 16) {
  if (needsNewPage(60)) doc.addPage();
  doc.fontSize(size).fillColor('#1e40af').font('Helvetica-Bold')
     .text(text).moveDown(0.5).fillColor('#000000');
}

// Add text
function addText(text, size = 11) {
  if (needsNewPage(40)) doc.addPage();
  doc.fontSize(size).font('Helvetica').text(text).moveDown(0.4);
}

// Add bullet
function addBullet(text) {
  if (needsNewPage(30)) doc.addPage();
  doc.fontSize(10).text('• ' + text, { indent: 15 }).moveDown(0.2);
}

// Add step
function addStep(num, title, desc) {
  if (needsNewPage(50)) doc.addPage();
  doc.fontSize(12).fillColor('#059669').font('Helvetica-Bold')
     .text(`${num}. ${title}`).moveDown(0.2);
  doc.fontSize(10).fillColor('#000000').font('Helvetica')
     .text(desc).moveDown(0.4);
}

// Add image inline
function addImage(file, caption, width = 450) {
  try {
    const imagePath = path.join(imagesDir, file);
    if (!fs.existsSync(imagePath)) return;
    
    if (needsNewPage(300)) doc.addPage();
    
    const x = (doc.page.width - width) / 2;
    doc.image(imagePath, x, doc.y, { width: width });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#666').font('Helvetica-Oblique')
       .text(caption, { align: 'center' }).moveDown(0.7);
    doc.fillColor('#000000');
    console.log(`✓ ${file}`);
  } catch (e) {
    console.log(`✗ ${file}`);
  }
}

// Add note box
function addNote(text, type = 'tip') {
  if (needsNewPage(70)) doc.addPage();
  const colors = {
    tip: { bg: '#d1fae5', border: '#10b981' },
    note: { bg: '#dbeafe', border: '#3b82f6' },
    warn: { bg: '#fef3c7', border: '#f59e0b' }
  };
  const c = colors[type];
  doc.roundedRect(50, doc.y, CONTENT_WIDTH, 50, 3).fillAndStroke(c.bg, c.border);
  doc.fontSize(9).font('Helvetica').text(text, 60, doc.y + 15, { width: CONTENT_WIDTH - 20 });
  doc.y += 60;
}

console.log('\n🚀 Generating PDF...\n');

// === COVER PAGE ===
doc.fontSize(28).fillColor('#1e40af').font('Helvetica-Bold')
   .text('JECRC NO DUES PORTAL', { align: 'center' }).moveDown(0.5);
doc.fontSize(20).fillColor('#2563eb').text('Staff User Guide', { align: 'center' }).moveDown(1.5);

if (fs.existsSync(logoPath)) {
  doc.image(logoPath, (doc.page.width - 150) / 2, doc.y, { width: 150 });
  doc.y += 160;
}

doc.fontSize(12).fillColor('#666').font('Helvetica')
   .text('Step-by-Step Instructions for Department Staff', { align: 'center' }).moveDown(0.3);
doc.fontSize(10).text('Login • Review • Approve • Reject • Support', { align: 'center' }).moveDown(3);
doc.text('JECRC University', { align: 'center' }).moveDown(0.2);
doc.text('Version 1.0 • ' + new Date().toLocaleDateString(), { align: 'center' });

// === SECTION 1: LOGIN ===
doc.addPage();
addTitle('1. Portal Access & Login', 18);
addText('Access the portal at: https://nodues.jecrcuniversity.edu.in/staff/login');

addStep(1, 'Open Login Page', 'Navigate to the portal URL in your browser');
addImage('login page.png', 'Fig 1: Staff Login Page');

addStep(2, 'Enter Credentials', 'Type your JECRC staff email and password');
addImage('login page 2 credentials.png', 'Fig 2: Enter Your Email and Password');

addStep(3, 'Click Login', 'Access your dashboard by clicking the Login button');
addNote('Use only your official JECRC email. Click "Forgot Password" if needed.', 'tip');

// === SECTION 2: DASHBOARD ===
doc.addPage();
addTitle('2. Staff Dashboard', 18);
addText('Your dashboard shows all pending student requests and key statistics.');

addImage('staff dashboard.png', 'Fig 3: Staff Dashboard - Main View');

addText('Dashboard Components:', 12);
addBullet('Statistics: Pending, approved, and rejected counts');
addBullet('Request List: Student name, enrollment, course, request type');
addBullet('Actions: View, Approve, Reject buttons for each request');
addBullet('Filters: Search and filter options');
addBullet('Menu: History, Rejected List, Support, Profile, Logout');

addImage('1) staff dashboard.png', 'Fig 4: Dashboard - Detailed View');

// === SECTION 3: REVIEWING ===
doc.addPage();
addTitle('3. Reviewing Student Requests', 18);
addText('Click "View" on any request to see complete student details.');

addImage('Individual form.png', 'Fig 5: Individual Student Form - Complete Details');

addText('Review Process:', 12);
addStep(1, 'Check Student Info', 'Verify name, enrollment, course, contact details');
addStep(2, 'Check Request Details', 'Review request type, purpose, submission date');
addStep(3, 'Check Department Status', '✅ Approved | ⏳ Pending | ❌ Rejected by other departments');
addStep(4, 'Verify Records', 'Check your department records for pending dues');

addText('What to Verify (Based on Your Department):', 12);
addBullet('Library: Books returned, no fines, no lost/damaged items');
addBullet('Accounts: All fees paid, no pending charges');
addBullet('Hostel: Room vacated, fees cleared, no damages');
addBullet('Academic: Assignments submitted, projects completed, lab work done');

addNote('Always verify from official records before taking action.', 'warn');

// === SECTION 4: APPROVING ===
doc.addPage();
addTitle('4. Approving Requests', 18);

addText('Two Ways to Approve:', 12);
addText('Method 1 - From Dashboard:');
addBullet('Click green "Approve" button next to student name');
addBullet('Add optional comments');
addBullet('Confirm approval');

addText('Method 2 - From Individual Form:');
addBullet('Open student form by clicking "View"');
addBullet('Review all details thoroughly');
addBullet('Click "Approve" button');
addBullet('Enter comments and submit');

addText('After Approval:', 12);
addBullet('Student receives email notification');
addBullet('Your department marked as approved');
addBullet('Request moves to other pending departments');
addBullet('Record saved in your History');

addNote('Cannot undo approvals. Double-check before confirming!', 'warn');

// === SECTION 5: REJECTING ===
doc.addPage();
addTitle('5. Rejecting Requests', 18);

addText('How to Reject:', 12);
addStep(1, 'Click Reject Button', 'Red "Reject" button on dashboard or form');
addStep(2, 'Enter Detailed Reason', 'MUST provide specific, clear explanation');
addStep(3, 'Submit', 'Confirm rejection');

addText('Writing Good Rejection Comments:', 12);
addText('❌ Bad: "Pending dues" or "Requirements not met"');
addText('✅ Good: "Library book \'Engg Mathematics\' (LIB-12345) not returned. Due: 15/11/2024. Return to main library and clear ₹150 fine."');

addText('Always Include:', 12);
addBullet('Specific item/amount/requirement pending');
addBullet('Reference numbers, dates, identifiers');
addBullet('Location to resolve (building, room)');
addBullet('Deadline for resolution');
addBullet('Contact person if help needed');

addImage('Rejection list.png', 'Fig 6: Rejected Students List - Track All Rejections');

addNote('Student receives your exact comments. Be professional and specific.', 'tip');

// === SECTION 6: HISTORY ===
doc.addPage();
addTitle('6. History & Tracking', 18);

addImage('history list.png', 'Fig 7: History - All Processed Requests');

addText('Your history shows:');
addBullet('All requests you have processed');
addBullet('Actions taken (Approved/Rejected)');
addBullet('Date and time of each action');
addBullet('Comments you provided');
addBullet('Current status of requests');

addText('Use filters to find specific records by date, action type, or student name.');

// === SECTION 7: SUPPORT ===
doc.addPage();
addTitle('7. Support Tickets', 18);

addImage('Support .png', 'Fig 8: Support Tickets - Handle Student Queries');

addText('Students can raise tickets for issues, questions, or disputes.');

addText('Responding to Tickets:', 12);
addStep(1, 'Open Ticket', 'Click to view student message');
addStep(2, 'Read & Verify', 'Understand issue and check records');
addStep(3, 'Write Response', 'Clear, helpful reply');
addStep(4, 'Update Status', 'Mark as In Progress or Resolved');

addText('Ticket Types:', 12);
addBullet('Rejection Appeals: Review if student resolved issues');
addBullet('Technical Issues: Forward to IT if needed');
addBullet('General Queries: Provide clear guidance');
addBullet('Urgent: Prioritize and respond within 24 hours');

addNote('Respond to all tickets within 48 hours for best service.', 'tip');

// === SECTION 8: BEST PRACTICES ===
doc.addPage();
addTitle('8. Best Practices', 18);

addText('Time Management:', 12);
addBullet('Process requests within 2-3 working days');
addBullet('Handle urgent requests first');
addBullet('Review pending list daily');
addBullet('Respond to tickets within 48 hours');

addText('Security:', 12);
addBullet('Never share login credentials');
addBullet('Always logout when done');
addBullet('Use secure internet connection');
addBullet('Report suspicious activity');

addText('Communication:', 12);
addBullet('Be professional and respectful');
addBullet('Provide specific, actionable information');
addBullet('Include all necessary details');
addBullet('Proofread before submitting');

// === TROUBLESHOOTING ===
doc.addPage();
addTitle('9. Troubleshooting', 18);

addText('Cannot Login:', 12);
addBullet('Use JECRC staff email only');
addBullet('Check password (case-sensitive)');
addBullet('Clear browser cache');
addBullet('Try different browser');
addBullet('Use "Forgot Password" to reset');

addText('Dashboard Not Loading:', 12);
addBullet('Check internet connection');
addBullet('Refresh page (F5 or Ctrl+R)');
addBullet('Clear cache and cookies');
addBullet('Try incognito/private mode');

addText('Buttons Not Working:', 12);
addBullet('Verify permissions');
addBullet('Check if already processed');
addBullet('Refresh page');
addBullet('Report via support ticket');

addText('Accidental Approval:', 12);
addBullet('Contact Department Head immediately');
addBullet('Inform system administrator');
addBullet('Provide request details');
addBullet('Act quickly for reversal');

// === SUPPORT CONTACTS ===
doc.addPage();
addTitle('10. Support & Contacts', 18);

addText('Technical Support:', 12);
addBullet('Email: it.support@jecrcuniversity.edu.in');
addBullet('Raise ticket through portal');
addBullet('Visit IT Department');

addText('Administrative Support:', 12);
addBullet('Email: admin@jecrcuniversity.edu.in');
addBullet('Contact Department Head');
addBullet('Visit Administration Office');

addText('Emergency:', 12);
addBullet('Mark ticket as "URGENT"');
addBullet('Call university helpline');
addBullet('Email with "URGENT" in subject');

// === SUMMARY ===
doc.addPage();
addTitle('Quick Reference', 18);

addText('Portal URL: https://nodues.jecrcuniversity.edu.in/staff/login', 11);
doc.moveDown(0.3);

addText('Key Steps:', 12);
addBullet('Login with JECRC staff email');
addBullet('Review complete student information');
addBullet('Verify from department records');
addBullet('Approve if no pending dues');
addBullet('Reject with specific reasons');
addBullet('Respond to support tickets promptly');

doc.moveDown(1);
addText('Remember:', 12);
addBullet('Process within 2-3 days');
addBullet('Cannot undo approvals');
addBullet('Be specific in rejections');
addBullet('Maintain security');
addBullet('Contact support if needed');

doc.moveDown(2);
doc.fontSize(14).fillColor('#059669').font('Helvetica-Bold')
   .text('Thank You!', { align: 'center' }).moveDown(0.5);
doc.fontSize(11).fillColor('#666').font('Helvetica')
   .text('Your dedication to serving students is appreciated.', { align: 'center' }).moveDown(2);

doc.fontSize(9).fillColor('#999')
   .text('JECRC University - No Dues Portal Staff Guide v1.0', { align: 'center' }).moveDown(0.2);
doc.text('© ' + new Date().getFullYear() + ' JECRC University', { align: 'center' });

doc.end();

console.log('\n✅ PDF Generated Successfully!');
console.log('📄 Location: ' + outputPath);
console.log('📊 Compact format with inline images');
console.log('✨ Ready to use!\n');