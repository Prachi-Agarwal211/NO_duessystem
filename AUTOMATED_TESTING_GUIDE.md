# Automated Testing Guide - JECRC No Dues System

## 🤖 Fully Automated E2E Testing with Playwright

This guide provides **automated scripts** that test the entire system without manual intervention. Tests run in real browsers and verify all workflows end-to-end.

---

## 📦 Setup (One-Time, 5 minutes)

### Step 1: Install Playwright
```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Step 2: Create Test Data in Database

Run this SQL in Supabase SQL Editor:

```sql
-- Create 2 convocation test entries
INSERT INTO convocation_students (
  registration_no, name, school, course, branch, admission_year
) VALUES
  ('22TEST001', 'Test Student Alpha', 'School of Engineering and Technology', 'B.Tech', 'Computer Science', '2022'),
  ('22TEST002', 'Test Student Beta', 'School of Management', 'MBA', NULL, '2022')
ON CONFLICT (registration_no) DO NOTHING;
```

### Step 3: Create 7 Test Auth Accounts

Go to **Supabase Dashboard → Authentication → Users** and create:

| Email | Password | Role |
|-------|----------|------|
| `test.student1@jecrcu.edu.in` | `Test@123` | Student |
| `test.student2@jecrcu.edu.in` | `Test@123` | Student |
| `test.student3@jecrcu.edu.in` | `Test@123` | Student |
| `test.hod@jecrcu.edu.in` | `Test@123` | HOD |
| `test.library@jecrcu.edu.in` | `Test@123` | Library Staff |
| `test.hostel@jecrcu.edu.in` | `Test@123` | Hostel Staff |
| `test.admin@jecrcu.edu.in` | `Test@123` | Admin |

### Step 4: Create User Profiles

After creating auth accounts, run this SQL (replace UUIDs with actual ones):

```sql
INSERT INTO profiles (id, full_name, email, role, department_id) VALUES
  ('UUID-1', 'Test Student Alpha', 'test.student1@jecrcu.edu.in', 'student', NULL),
  ('UUID-2', 'Test Student Beta', 'test.student2@jecrcu.edu.in', 'student', NULL),
  ('UUID-3', 'Test Student Gamma', 'test.student3@jecrcu.edu.in', 'student', NULL),
  ('UUID-4', 'Test HOD', 'test.hod@jecrcu.edu.in', 'hod', 
    (SELECT id FROM departments WHERE name = 'School HOD' LIMIT 1)),
  ('UUID-5', 'Test Librarian', 'test.library@jecrcu.edu.in', 'department', 
    (SELECT id FROM departments WHERE name = 'Library' LIMIT 1)),
  ('UUID-6', 'Test Hostel Manager', 'test.hostel@jecrcu.edu.in', 'department', 
    (SELECT id FROM departments WHERE name = 'Hostel' LIMIT 1)),
  ('UUID-7', 'Test Admin', 'test.admin@jecrcu.edu.in', 'admin', NULL)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;
```

---

## 🚀 Running Tests

### Run All Tests (Automated)
```bash
# Run all tests with visual UI
npx playwright test --ui

# Run in headless mode (CI/CD)
npx playwright test

# Run specific test
npx playwright test tests/e2e/complete-system-test.spec.js

# Run in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run Tests Against Production
```bash
# Test deployed site
TEST_URL=https://no-duessystem.onrender.com npx playwright test

# Test localhost
TEST_URL=http://localhost:3000 npx playwright test
```

### Run Tests in Debug Mode
```bash
# Step through tests with debugger
npx playwright test --debug

# Slow motion (useful for watching)
npx playwright test --headed --slow-mo=1000
```

---

## 📊 What Gets Tested (Automatically)

### ✅ 10 Complete Workflows

| Test # | Workflow | Duration | Auto-Verified |
|--------|----------|----------|---------------|
| **1** | Regular form submission (convocation) | ~15s | Auto-fill, validation, submission |
| **2** | Regular form (non-convocation) | ~15s | Warning message, manual entry |
| **3** | Manual entry upload | ~20s | PDF upload, RLS bypass |
| **4** | Admin verification | ~10s | Manual entry approval |
| **5** | Department approval chain | ~30s | All 7 departments in sequence |
| **6** | Rejection cascade | ~15s | Blocking subsequent departments |
| **7** | Student status check | ~10s | Real-time status display |
| **8** | Reapplication | ~20s | New form creation |
| **9** | Support ticket | ~15s | Ticket creation and admin view |
| **10** | Admin dashboard | ~10s | Stats accuracy, performance |

**Total Test Time:** ~3 minutes (all tests)

### ✅ Additional Automated Tests

- **Performance Tests:** Page load times (< 3 seconds target)
- **Accessibility Tests:** Alt text, form labels, ARIA
- **Security Tests:** Protected route access
- **Mobile Tests:** iPhone, Android layouts
- **Cross-Browser:** Chrome, Firefox, Safari

---

## 📋 Test Scenarios Explained

### TEST 1: Convocation Auto-Fill ✨
```javascript
// What it does:
1. Enters registration number: 22TEST001
2. Waits for API call to /api/convocation/validate
3. Verifies name auto-fills: "Test Student Alpha"
4. Checks for "Eligible" badge
5. Completes and submits form
6. Verifies success message

// Expected: PASS
// Time: ~15 seconds
```

### TEST 2: Non-Convocation Submission ⚠️
```javascript
// What it does:
1. Enters registration number: 22TEST003 (not in database)
2. Verifies warning: "Not eligible for convocation"
3. Fills all fields manually
4. Submits form successfully

// Expected: PASS
// Time: ~15 seconds
```

### TEST 3: Manual Entry Upload 📄
```javascript
// What it does:
1. Generates dummy PDF certificate
2. Uploads via drag-and-drop or file picker
3. Verifies upload uses /api/upload route (not direct Supabase)
4. Checks for no RLS errors
5. Submits for admin verification

// Expected: PASS (if upload fix applied)
// Time: ~20 seconds
```

### TEST 4: Admin Verification 👨‍💼
```javascript
// What it does:
1. Logs in as test.admin@jecrcu.edu.in
2. Navigates to Manual Entries tab
3. Searches for TEST004 form
4. Clicks "Verify & Create Form"
5. Confirms form enters normal workflow

// Expected: PASS
// Time: ~10 seconds
```

### TEST 5: Approval Chain (Critical!) ⚡
```javascript
// What it does:
1. Logs in as HOD → approves TEST001
2. Logs in as Library → approves TEST001
3. Logs in as Hostel → approves TEST001
4. [Continues for all 7 departments]
5. Verifies certificate auto-generates

// Expected: PASS
// Time: ~30 seconds
```

### TEST 6: Rejection Cascade ❌
```javascript
// What it does:
1. HOD approves TEST002
2. Library REJECTS TEST002 with remarks
3. Verifies form status = "rejected"
4. Logs in as Hostel
5. Confirms form NOT visible in pending queue

// Expected: PASS
// Time: ~15 seconds
```

### TEST 7: Status Check 🔍
```javascript
// What it does:
1. Goes to /student/check-status
2. Enters registration number
3. Verifies all 7 departments displayed
4. Checks approval statuses and timestamps
5. Verifies overall status badge

// Expected: PASS
// Time: ~10 seconds
```

### TEST 8: Reapplication 🔄
```javascript
// What it does:
1. Checks rejected form status
2. Clicks "Reapply" button
3. Confirms acknowledgement
4. Submits new form
5. Verifies old form marked "reapplied"

// Expected: PASS
// Time: ~20 seconds
```

### TEST 9: Support Tickets 🎫
```javascript
// What it does:
1. Opens support widget
2. Creates ticket: "Cannot upload file"
3. Verifies ticket submission
4. Logs in as admin
5. Confirms ticket visible in dashboard

// Expected: PASS
// Time: ~15 seconds
```

### TEST 10: Dashboard Stats 📊
```javascript
// What it does:
1. Logs in as admin
2. Loads dashboard
3. Verifies all stat cards render
4. Checks charts display
5. Measures load time (< 5s target)

// Expected: PASS
// Time: ~10 seconds
```

---

## 📸 Test Reports

After tests run, you get:

### 1. HTML Report (Visual)
```bash
# View interactive report
npx playwright show-report
```
- ✅ Pass/Fail for each test
- 📸 Screenshots on failure
- 🎥 Video recordings
- 📊 Performance metrics

### 2. JSON Report (Machine-Readable)
```bash
# Located at: test-results/results.json
cat test-results/results.json
```

### 3. Console Output (Real-Time)
```
Running 10 tests using 1 worker

  ✓ TEST 1: Submit form with convocation auto-fill (15s)
  ✓ TEST 2: Submit form without convocation data (14s)
  ✓ TEST 3: Upload manual entry certificate (22s)
  ✓ TEST 4: Admin approves manual entry (11s)
  ✓ TEST 5: Complete department approval chain (28s)
  ✓ TEST 6: Library rejects form and blocks subsequent (16s)
  ✓ TEST 7: Student views application status (9s)
  ✓ TEST 8: Student reapplies after rejection (19s)
  ✓ TEST 9: Create and view support ticket (14s)
  ✓ TEST 10: Verify admin dashboard stats (12s)

  10 passed (2m 40s)
```

---

## 🔧 Troubleshooting

### Issue 1: Tests Fail with "Navigation timeout"
**Solution:**
```bash
# Increase timeout in playwright.config.js
navigationTimeout: 60000  # 60 seconds
```

### Issue 2: Login Tests Fail
**Solution:**
1. Verify test accounts exist in Supabase Auth
2. Check profiles table has matching entries
3. Ensure passwords are correct: `Test@123`

### Issue 3: File Upload Fails
**Solution:**
1. Verify `/api/upload` route exists
2. Check `SUPABASE_SERVICE_ROLE_KEY` in environment
3. Confirm manual entry fix was applied

### Issue 4: "Element not found" Errors
**Solution:**
```javascript
// Update selectors in test file if UI changed
await page.locator('button:has-text("Submit")').click();
// or
await page.locator('[data-testid="submit-button"]').click();
```

---

## 🧹 Cleanup After Testing

### Automated Cleanup Script
```sql
-- Run in Supabase SQL Editor
BEGIN;

DELETE FROM department_statuses
WHERE form_id IN (SELECT id FROM student_forms WHERE registration_no LIKE '22TEST%');

DELETE FROM student_forms WHERE registration_no LIKE '22TEST%';

DELETE FROM convocation_students WHERE registration_no IN ('22TEST001', '22TEST002');

DELETE FROM profiles WHERE email LIKE 'test.%@jecrcu.edu.in';

COMMIT;
```

### Delete Auth Accounts
Go to **Supabase → Authentication → Users** and delete:
- test.student1@jecrcu.edu.in
- test.student2@jecrcu.edu.in
- test.student3@jecrcu.edu.in
- test.hod@jecrcu.edu.in
- test.library@jecrcu.edu.in
- test.hostel@jecrcu.edu.in
- test.admin@jecrcu.edu.in

---

## 🎯 CI/CD Integration (GitHub Actions)

Create `.github/workflows/test.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run tests
        run: npx playwright test
        env:
          TEST_URL: ${{ secrets.TEST_URL }}
      
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
```

---

## 📊 Success Metrics

After running tests, you should see:

```
✅ 10/10 Workflow tests PASSED
✅ 5/5 Performance tests PASSED (all pages < 3s)
✅ 3/3 Accessibility tests PASSED
✅ 3/3 Security tests PASSED
✅ 5/5 Cross-browser tests PASSED

Overall: 26/26 tests PASSED (100%)
```

---

## 🚀 Next Steps

1. **Run Tests Locally:**
   ```bash
   npx playwright test --ui
   ```

2. **Review Test Report:**
   ```bash
   npx playwright show-report
   ```

3. **Fix Any Failures:**
   - Check screenshots in `test-results/`
   - Review error messages
   - Update code and re-run

4. **Deploy to Production:**
   ```bash
   # After all tests pass
   git push origin main
   ```

5. **Setup CI/CD:**
   - Add GitHub Actions workflow
   - Tests run automatically on every push

---

## 📚 Files Created

1. **[`tests/e2e/complete-system-test.spec.js`](tests/e2e/complete-system-test.spec.js:1)** - Automated test suite (600+ lines)
2. **[`playwright.config.js`](playwright.config.js:1)** - Playwright configuration
3. **[`AUTOMATED_TESTING_GUIDE.md`](AUTOMATED_TESTING_GUIDE.md:1)** - This guide

---

## ⏱️ Time Comparison

| Method | Setup | Execution | Total |
|--------|-------|-----------|-------|
| **Manual Testing** | 7 min | 20 min | **27 min** |
| **Automated Testing** | 5 min (one-time) | 3 min | **8 min** ✅ |

**Time Saved:** 70% faster + repeatable!

---

## 🎉 Benefits

✅ **Fully Automated** - No manual clicking  
✅ **Fast** - 3 minutes for all tests  
✅ **Repeatable** - Same results every time  
✅ **Visual** - Screenshots and videos on failure  
✅ **Cross-Browser** - Chrome, Firefox, Safari  
✅ **CI/CD Ready** - Runs on every deployment  
✅ **Performance Tracking** - Load time metrics  
✅ **Accessibility** - WCAG compliance checks  

---

**Ready to run automated tests!** 🚀

```bash
npx playwright test --ui