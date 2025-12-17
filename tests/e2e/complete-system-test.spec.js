/**
 * JECRC No Dues System - Complete E2E Test Suite
 * 
 * This automated test suite covers all 10 test scenarios:
 * 1. Regular form submission (convocation eligible)
 * 2. Regular form submission (not in convocation)
 * 3. Manual entry submission
 * 4. Admin manual entry verification
 * 5. Department approval workflow
 * 6. Rejection cascade
 * 7. Student status check
 * 8. Reapplication after rejection
 * 9. Support ticket system
 * 10. Admin dashboard statistics
 * 
 * Setup: npm install --save-dev @playwright/test
 * Run: npx playwright test tests/e2e/complete-system-test.spec.js
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_ACCOUNTS = {
  student1: { email: 'test.student1@jecrcu.edu.in', password: 'Test@123', name: 'Test Student Alpha' },
  student2: { email: 'test.student2@jecrcu.edu.in', password: 'Test@123', name: 'Test Student Beta' },
  student3: { email: 'test.student3@jecrcu.edu.in', password: 'Test@123', name: 'Test Student Gamma' },
  hod: { email: 'test.hod@jecrcu.edu.in', password: 'Test@123', name: 'Test HOD' },
  library: { email: 'test.library@jecrcu.edu.in', password: 'Test@123', name: 'Test Librarian' },
  hostel: { email: 'test.hostel@jecrcu.edu.in', password: 'Test@123', name: 'Test Hostel Manager' },
  admin: { email: 'test.admin@jecrcu.edu.in', password: 'Test@123', name: 'Test Admin' }
};

const TEST_REGISTRATION_NUMBERS = {
  convocation: '22TEST001', // In convocation database
  regular: '22TEST003',      // Not in convocation
  manualEntry: '22TEST004',  // Manual entry test
  rejection: '22TEST002'     // For rejection workflow
};

// Helper functions
async function login(page, email, password) {
  await page.goto(`${BASE_URL}/staff/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(staff|admin|student)\//, { timeout: 10000 });
}

async function logout(page) {
  await page.click('button:has-text("Logout"), a:has-text("Logout")');
  await page.waitForURL(`${BASE_URL}/`);
}

async function createDummyPDF() {
  // Create a simple PDF buffer for testing
  return Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Test Certificate) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000015 00000 n\n0000000068 00000 n\n0000000125 00000 n\n0000000277 00000 n\n0000000361 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n456\n%%EOF');
}

// ==========================================
// TEST SUITE
// ==========================================

test.describe('JECRC No Dues System - Complete E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ==========================================
  // TEST 1: Regular Form Submission (Convocation Eligible)
  // ==========================================
  test('TEST 1: Submit form with convocation auto-fill', async ({ page }) => {
    await test.step('Login as student', async () => {
      await page.goto(`${BASE_URL}/student/submit-form`);
      // Assuming public access or navigate to login first
    });

    await test.step('Fill registration number', async () => {
      await page.fill('input[name="registration_no"]', TEST_REGISTRATION_NUMBERS.convocation);
      await page.blur('input[name="registration_no"]'); // Trigger validation
      await page.waitForTimeout(2000); // Wait for API call
    });

    await test.step('Verify auto-fill from convocation', async () => {
      const nameField = page.locator('input[name="student_name"], input:has-text("Name")');
      const nameValue = await nameField.inputValue();
      expect(nameValue).toBe('Test Student Alpha');
      
      // Check for success indicator
      await expect(page.locator('text=Eligible')).toBeVisible();
      await expect(page.locator('text=Convocation')).toBeVisible();
    });

    await test.step('Fill remaining fields', async () => {
      // School should be auto-selected
      await page.selectOption('select[name="course"]', { label: /B\.Tech/i });
      await page.selectOption('select[name="branch"]', { label: /Computer Science/i });
      await page.fill('input[name="personal_email"]', 'test1@example.com');
      await page.fill('input[name="contact_no"]', '9876543210');
      
      // Upload dummy file
      const pdfBuffer = await createDummyPDF();
      await page.setInputFiles('input[type="file"]', {
        name: 'test-certificate.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer
      });
    });

    await test.step('Submit form', async () => {
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Success, text=Submitted')).toBeVisible({ timeout: 10000 });
    });
  });

  // ==========================================
  // TEST 2: Regular Form Submission (Not in Convocation)
  // ==========================================
  test('TEST 2: Submit form without convocation data', async ({ page }) => {
    await page.goto(`${BASE_URL}/student/submit-form`);

    await test.step('Enter non-convocation registration number', async () => {
      await page.fill('input[name="registration_no"]', TEST_REGISTRATION_NUMBERS.regular);
      await page.blur('input[name="registration_no"]');
      await page.waitForTimeout(2000);
    });

    await test.step('Verify warning message', async () => {
      await expect(page.locator('text=not eligible, text=Not in list')).toBeVisible();
    });

    await test.step('Fill all fields manually', async () => {
      await page.fill('input[name="student_name"]', 'Test Student Charlie');
      await page.selectOption('select[name="school"]', { index: 1 });
      await page.selectOption('select[name="course"]', { index: 1 });
      await page.fill('input[name="personal_email"]', 'test3@example.com');
      await page.fill('input[name="contact_no"]', '9876543211');
      
      const pdfBuffer = await createDummyPDF();
      await page.setInputFiles('input[type="file"]', {
        name: 'test-certificate.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer
      });
    });

    await test.step('Submit form successfully', async () => {
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Success, text=Submitted')).toBeVisible({ timeout: 10000 });
    });
  });

  // ==========================================
  // TEST 3: Manual Entry Submission
  // ==========================================
  test('TEST 3: Upload manual entry certificate', async ({ page }) => {
    await page.goto(`${BASE_URL}/student/manual-entry`);

    await test.step('Fill manual entry form', async () => {
      await page.fill('input[name="registration_no"]', TEST_REGISTRATION_NUMBERS.manualEntry);
      await page.selectOption('select[name="school"]', { index: 1 });
      await page.selectOption('select[name="course"]', { index: 1 });
      await page.fill('input[name="personal_email"]', 'test4@example.com');
    });

    await test.step('Upload PDF certificate', async () => {
      const pdfBuffer = await createDummyPDF();
      await page.setInputFiles('input[type="file"][accept*="pdf"]', {
        name: 'manual-certificate.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer
      });
      
      // Verify file preview
      await expect(page.locator('text=manual-certificate.pdf')).toBeVisible();
    });

    await test.step('Submit for verification', async () => {
      await page.click('button:has-text("Submit")');
      await expect(page.locator('text=Success, text=registered')).toBeVisible({ timeout: 15000 });
    });
  });

  // ==========================================
  // TEST 4: Admin Verifies Manual Entry
  // ==========================================
  test('TEST 4: Admin approves manual entry', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);

    await test.step('Navigate to manual entries', async () => {
      await page.goto(`${BASE_URL}/admin`);
      await page.click('text=Manual Entries');
    });

    await test.step('Find and verify manual entry', async () => {
      await page.fill('input[placeholder*="Search"]', TEST_REGISTRATION_NUMBERS.manualEntry);
      await page.waitForTimeout(1000);
      
      // Click verify button
      await page.click(`tr:has-text("${TEST_REGISTRATION_NUMBERS.manualEntry}") button:has-text("Verify")`);
      await page.click('button:has-text("Confirm")');
      await expect(page.locator('text=Verified, text=Success')).toBeVisible();
    });

    await logout(page);
  });

  // ==========================================
  // TEST 5: Department Approval Workflow
  // ==========================================
  test('TEST 5: Complete department approval chain', async ({ page }) => {
    const departments = [
      { account: TEST_ACCOUNTS.hod, name: 'School HOD' },
      { account: TEST_ACCOUNTS.library, name: 'Library' },
      { account: TEST_ACCOUNTS.hostel, name: 'Hostel' }
    ];

    for (const dept of departments) {
      await test.step(`${dept.name} approves`, async () => {
        await login(page, dept.account.email, dept.account.password);
        await page.goto(`${BASE_URL}/staff/dashboard`);
        
        // Find pending approval
        await page.fill('input[placeholder*="Search"]', TEST_REGISTRATION_NUMBERS.convocation);
        await page.waitForTimeout(1000);
        
        // Click on the form
        await page.click(`tr:has-text("${TEST_REGISTRATION_NUMBERS.convocation}")`);
        
        // Approve
        await page.click('button:has-text("Approve")');
        await page.fill('textarea[name="remarks"]', `Approved by ${dept.name}`);
        await page.click('button:has-text("Confirm")');
        await expect(page.locator('text=Approved, text=Success')).toBeVisible();
        
        await logout(page);
      });
    }
  });

  // ==========================================
  // TEST 6: Rejection Cascade
  // ==========================================
  test('TEST 6: Library rejects form and blocks subsequent departments', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.library.email, TEST_ACCOUNTS.library.password);

    await test.step('Find and reject form', async () => {
      await page.goto(`${BASE_URL}/staff/dashboard`);
      await page.fill('input[placeholder*="Search"]', TEST_REGISTRATION_NUMBERS.rejection);
      await page.click(`tr:has-text("${TEST_REGISTRATION_NUMBERS.rejection}")`);
      
      await page.click('button:has-text("Reject")');
      await page.fill('textarea[name="remarks"]', 'Library books not returned');
      await page.click('button:has-text("Confirm")');
      await expect(page.locator('text=Rejected, text=Success')).toBeVisible();
    });

    await logout(page);

    await test.step('Verify subsequent departments cannot act', async () => {
      await login(page, TEST_ACCOUNTS.hostel.email, TEST_ACCOUNTS.hostel.password);
      await page.goto(`${BASE_URL}/staff/dashboard`);
      
      // Should not see the rejected form in pending
      const formRow = page.locator(`tr:has-text("${TEST_REGISTRATION_NUMBERS.rejection}")`);
      await expect(formRow).not.toBeVisible();
      
      await logout(page);
    });
  });

  // ==========================================
  // TEST 7: Student Checks Status
  // ==========================================
  test('TEST 7: Student views application status', async ({ page }) => {
    await page.goto(`${BASE_URL}/student/check-status`);

    await test.step('Enter registration number', async () => {
      await page.fill('input[name="registration_no"]', TEST_REGISTRATION_NUMBERS.convocation);
      await page.click('button:has-text("Check Status")');
      await page.waitForTimeout(2000);
    });

    await test.step('Verify status display', async () => {
      // Should show all departments
      await expect(page.locator('text=School HOD')).toBeVisible();
      await expect(page.locator('text=Library')).toBeVisible();
      await expect(page.locator('text=Hostel')).toBeVisible();
      
      // Should show approval statuses
      await expect(page.locator('text=Approved').first()).toBeVisible();
      
      // Overall status badge
      await expect(page.locator('text=Under Review, text=Approved, text=Pending')).toBeVisible();
    });
  });

  // ==========================================
  // TEST 8: Reapplication After Rejection
  // ==========================================
  test('TEST 8: Student reapplies after rejection', async ({ page }) => {
    await page.goto(`${BASE_URL}/student/check-status`);

    await test.step('Check rejected form', async () => {
      await page.fill('input[name="registration_no"]', TEST_REGISTRATION_NUMBERS.rejection);
      await page.click('button:has-text("Check Status")');
      await page.waitForTimeout(2000);
      
      // Should show rejection message
      await expect(page.locator('text=Rejected')).toBeVisible();
      await expect(page.locator('text=Library books not returned')).toBeVisible();
    });

    await test.step('Click reapply button', async () => {
      await page.click('button:has-text("Reapply")');
      await expect(page.locator('text=resolved, text=acknowledgement')).toBeVisible();
      await page.click('button:has-text("Confirm")');
    });

    await test.step('Submit new form', async () => {
      // Should redirect to submit form page with pre-filled data
      await expect(page).toHaveURL(/submit-form/);
      
      const pdfBuffer = await createDummyPDF();
      await page.setInputFiles('input[type="file"]', {
        name: 'reapply-certificate.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer
      });
      
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Success, text=Submitted')).toBeVisible();
    });
  });

  // ==========================================
  // TEST 9: Support Ticket System
  // ==========================================
  test('TEST 9: Create and view support ticket', async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    await test.step('Open support widget', async () => {
      await page.click('button:has-text("Support"), [aria-label*="Support"]');
      await expect(page.locator('text=Submit Ticket, text=Support')).toBeVisible();
    });

    await test.step('Fill ticket form', async () => {
      await page.selectOption('select[name="category"]', 'Technical Issue');
      await page.fill('input[name="subject"]', 'Automated Test Ticket - Cannot upload file');
      await page.fill('textarea[name="description"]', 'This is an automated test ticket. Getting error when uploading PDF file.');
      await page.click('button:has-text("Submit Ticket")');
      await expect(page.locator('text=Ticket created, text=Success')).toBeVisible();
    });

    await test.step('Admin views ticket', async () => {
      await login(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
      await page.goto(`${BASE_URL}/admin`);
      await page.click('text=Support');
      
      await expect(page.locator('text=Automated Test Ticket')).toBeVisible();
      
      await logout(page);
    });
  });

  // ==========================================
  // TEST 10: Admin Dashboard Statistics
  // ==========================================
  test('TEST 10: Verify admin dashboard stats', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);

    await test.step('Navigate to dashboard', async () => {
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify stats cards', async () => {
      // Should show various statistics
      await expect(page.locator('text=Total Applications')).toBeVisible();
      await expect(page.locator('text=Pending')).toBeVisible();
      await expect(page.locator('text=Under Review')).toBeVisible();
      await expect(page.locator('text=Approved')).toBeVisible();
      await expect(page.locator('text=Rejected')).toBeVisible();
      await expect(page.locator('text=Manual Entries')).toBeVisible();
    });

    await test.step('Verify charts render', async () => {
      // Check if charts/graphs are present
      await expect(page.locator('canvas, svg[class*="chart"]').first()).toBeVisible();
    });

    await test.step('Check performance', async () => {
      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`Dashboard load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds
    });

    await logout(page);
  });

  // ==========================================
  // PERFORMANCE TESTS
  // ==========================================
  test('PERFORMANCE: Check page load times', async ({ page }) => {
    const pages = [
      { url: '/', name: 'Landing Page' },
      { url: '/student/submit-form', name: 'Submit Form' },
      { url: '/student/check-status', name: 'Check Status' },
      { url: '/staff/login', name: 'Staff Login' }
    ];

    for (const testPage of pages) {
      await test.step(`Load ${testPage.name}`, async () => {
        const startTime = Date.now();
        await page.goto(`${BASE_URL}${testPage.url}`);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        console.log(`${testPage.name} load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(3000); // Under 3 seconds
      });
    }
  });

  // ==========================================
  // ACCESSIBILITY TESTS
  // ==========================================
  test('ACCESSIBILITY: Check for common issues', async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    await test.step('Check for alt text on images', async () => {
      const images = await page.locator('img').all();
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });

    await test.step('Check for form labels', async () => {
      await page.goto(`${BASE_URL}/student/submit-form`);
      const inputs = await page.locator('input, select, textarea').all();
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          await expect(label).toBeVisible();
        }
      }
    });
  });

  // ==========================================
  // SECURITY TESTS
  // ==========================================
  test('SECURITY: Verify protected routes', async ({ page }) => {
    const protectedRoutes = [
      '/admin',
      '/staff/dashboard',
      '/admin/verify'
    ];

    for (const route of protectedRoutes) {
      await test.step(`Access ${route} without auth`, async () => {
        await page.goto(`${BASE_URL}${route}`);
        // Should redirect to login or show unauthorized
        await expect(page).toHaveURL(/login|unauthorized/);
      });
    }
  });

});