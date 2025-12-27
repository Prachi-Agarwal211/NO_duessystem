const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_FILE = 'JECRC-No-Dues-Staff-Guide.pdf';
const ASSETS_DIR = path.join(__dirname, '../public/assets');
const IMAGES_DIR = path.join(__dirname, '../no dues');

// Helper to add a section header
function addSectionHeader(doc, text) {
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#c00000').text(text); // JECRC Red-ish color
    doc.font('Helvetica').fontSize(12).fillColor('black').moveDown(0.5);
}

// Helper to add body text
function addBodyText(doc, text) {
    doc.fontSize(12).text(text, { align: 'justify', lineGap: 2 });
    doc.moveDown(0.5);
}

// Helper to add an image with caption
function addImage(doc, imageName, caption, height = 300) {
    const imagePath = path.join(IMAGES_DIR, imageName);
    if (fs.existsSync(imagePath)) {
        try {
            // Check vertical space, add new page if needed
            if (doc.y + height + 50 > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
            }

            doc.image(imagePath, { fit: [500, height], align: 'center' });
            doc.moveDown(0.5);
            if (caption) {
                doc.fontSize(10).font('Helvetica-Oblique').fillColor('#666666').text(caption, { align: 'center' });
                doc.font('Helvetica').fillColor('black').fontSize(12); // Reset
            }
            doc.moveDown(1);
        } catch (e) {
            console.error(`Error adding image ${imageName}:`, e);
            doc.text(`[Image missing or invalid: ${imageName}]`, { color: 'red' });
        }
    } else {
        console.warn(`Image not found: ${imagePath}`);
        doc.text(`[Image not found: ${imageName}]`, { color: 'red' });
    }
}

async function createGuide() {
    console.log('Starting PDF generation...');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(path.join(__dirname, '..', OUTPUT_FILE));

    doc.pipe(stream);

    // --- Cover Page ---
    const logoPath = path.join(ASSETS_DIR, 'logo light.png');
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, (doc.page.width - 200) / 2, 100, { width: 200 });
    }

    doc.moveDown(12);
    doc.font('Helvetica-Bold').fontSize(26).text('JECRC No Dues System', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(20).text('Staff User Guide', { align: 'center', color: '#555' });
    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

    doc.addPage();

    // --- Introduction ---
    addSectionHeader(doc, 'Introduction');
    addBodyText(doc, 'The JECRC No Dues System is your digital assistant for managing student clearance. This manual provides a comprehensive, step-by-step guide on how to navigate the portal, verify student records, and manage approvals efficiently.');

    // --- Accessing the Portal ---
    addSectionHeader(doc, 'Step 1: Accessing the Portal');
    addBodyText(doc, 'To begin, you need to access the staff login page.');

    doc.font('Helvetica-Bold').text('Instruction:', { underline: true });
    doc.font('Helvetica').list([
        'Open your web browser (Chrome, Firefox, or Edge).',
        'Navigate to the following URL:'
    ]);
    doc.fillColor('blue').text('https://nodues.jecrcuniversity.edu.in/staff/login', { link: 'https://nodues.jecrcuniversity.edu.in/staff/login', underline: true, indent: 20 });
    doc.fillColor('black').moveDown(0.5);
    doc.list([
        'Enter your registered Email Address.',
        'Enter your Password.',
        'Click the "Login" button.'
    ]);
    doc.moveDown();

    addImage(doc, 'login page.png', 'Figure 1: Staff Login Screen');

    // --- Dashboard ---
    addSectionHeader(doc, 'Step 2: Understanding the Dashboard');
    addBodyText(doc, 'Once logged in, you will see the Dashboard. This screen gives you a quick summary of your department\'s activity.');

    doc.font('Helvetica-Bold').text('Key Elements:', { underline: true });
    doc.font('Helvetica').list([
        'Total Students: The total number of requests received.',
        'Pending: Requests waiting for your action.',
        'Approved: Requests you have already cleared.',
        'Rejected: Requests you have denied due to pending dues.'
    ]);
    doc.moveDown();

    addImage(doc, '1) staff dashboard.png', 'Figure 2: Staff Dashboard Overview');

    // --- Verifying Students ---
    addSectionHeader(doc, 'Step 3: Verifying a Student Request');
    addBodyText(doc, 'When a student applies for No Dues, their request appears in your list. Follow these steps to process it:');

    doc.font('Helvetica-Bold').text('Action Steps:', { underline: true });
    doc.list([
        'Locate the student in the "Pending" list or use the Search bar to find them by Name or Enrollment ID.',
        'Click on the "View Details" button next to their name.',
        'Review their profile carefully (Check Name, Batch, and Department).'
    ]);
    doc.moveDown(0.5);

    // Example Box - logic to avoid overlap
    const exampleY = doc.y;
    doc.rect(50, exampleY, 500, 60).fillAndStroke('#f0f0f0', '#999999'); // using absolute X=50 fits margins
    doc.fillColor('black').text('Example Scenario:', 60, exampleY + 10, { bold: true });
    doc.font('Helvetica').text('If a student "Rahul Sharma" from B.Tech CSE applies, check your department records (e.g., Library or Lab) to ensure he has returned all books/equipment.', 60, exampleY + 30, { width: 480 });
    doc.y = exampleY + 70; // Manually move cursor below box

    addImage(doc, 'Individual form.png', 'Figure 3: Student Details & Verification Form');

    // --- Processing Request ---
    addSectionHeader(doc, 'Step 4: Approving or Rejecting');
    addBodyText(doc, 'Based on your records, you will take one of two actions:');

    doc.font('Helvetica-Bold').text('Option A: Approve', { indent: 10 });
    doc.font('Helvetica').text('Click "Approve" if the student has NO outstanding dues. The student will be notified immediately.', { indent: 20 });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('Option B: Reject', { indent: 10 });
    doc.font('Helvetica').text('Click "Reject" if the student HAS pending dues.', { indent: 20 });
    doc.moveDown(1); // Added extra space before the box

    // Important Note Box - logic to avoid overlap
    const noteY = doc.y;
    doc.rect(50, noteY, 500, 50).fillAndStroke('#ffe6e6', '#cc0000');
    doc.fillColor('black').text('Important Note for Rejection:', 60, noteY + 10, { bold: true });
    doc.font('Helvetica').text('Always provide a clear reason in the specific field (e.g., "Physics Lab Manual missing") so the student knows exactly what to fix.', 60, noteY + 25, { width: 480 });
    doc.y = noteY + 60; // Manually move cursor below box

    addImage(doc, 'Rejection list.png', 'Figure 4: Rejection Confirmations');

    // --- History & Support ---
    addSectionHeader(doc, 'Step 5: Viewing History & Support');
    addBodyText(doc, 'You can audit your past actions in the "History" tab. If you face technical issues, use the "Support" section.');

    addImage(doc, 'history list.png', 'Figure 5: Action History Log');

    doc.addPage(); // Force new page for support to keep it clean if needed, or let flow. Let's force one for the final section.
    addSectionHeader(doc, 'Need Help?');
    addBodyText(doc, 'If the portal is not working as expected, or you cannot see a student\'s request:');
    doc.list([
        'Refresh the page.',
        'Check your internet connection.',
        'Raise a ticket in the "Support" section.'
    ]);

    addImage(doc, 'Support .png', 'Figure 6: Support Section');

    // --- Conclusion ---
    doc.moveDown(2);
    doc.font('Helvetica-Oblique').fontSize(10).text('For further assistance, please contact the IT Administration.', { align: 'center' });

    doc.end();

    stream.on('finish', () => {
        console.log(`PDF created successfully at: ${path.join(__dirname, '..', OUTPUT_FILE)}`);
    });
}

createGuide();
