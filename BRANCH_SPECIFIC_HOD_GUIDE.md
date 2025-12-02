# 🎯 BRANCH-SPECIFIC HOD CONFIGURATION GUIDE
**Use Case:** CSE forms → CSE HOD, Civil forms → Civil HOD

---

## 📋 **HOW IT WORKS**

The staff scope system allows you to configure HODs to see ONLY their branch students:

### **Example Setup:**

```
CSE HOD Account:
├─ Department: school_hod
├─ School: Engineering
├─ Course: B.Tech
└─ Branch: CSE ← Only sees CSE students

Civil HOD Account:
├─ Department: school_hod
├─ School: Engineering  
├─ Course: B.Tech
└─ Branch: Civil Engineering ← Only sees Civil students
```

---

## 🔧 **STEP-BY-STEP CONFIGURATION**

### **Step 1: Run Database Migration**

```sql
-- Open Supabase Dashboard → SQL Editor
-- Run: scripts/add-staff-scope.sql
```

This creates the `school_ids`, `course_ids`, `branch_ids` columns.

---

### **Step 2: Create CSE HOD Account**

**Admin → Settings → Staff Accounts → Add Staff**

| Field | Value |
|-------|-------|
| Email | `cse.hod@jecrc.ac.in` |
| Password | (secure password) |
| Full Name | `Dr. Rajesh Kumar` |
| Department | `school_hod` |
| **Schools** | ✅ Engineering |
| **Courses** | ✅ B.Tech |
| **Branches** | ✅ **CSE Only** |

**Result:** CSE HOD can ONLY see B.Tech CSE students from Engineering school.

---

### **Step 3: Create Civil HOD Account**

**Admin → Settings → Staff Accounts → Add Staff**

| Field | Value |
|-------|-------|
| Email | `civil.hod@jecrc.ac.in` |
| Password | (secure password) |
| Full Name | `Dr. Sunita Sharma` |
| Department | `school_hod` |
| **Schools** | ✅ Engineering |
| **Courses** | ✅ B.Tech |
| **Branches** | ✅ **Civil Engineering Only** |

**Result:** Civil HOD can ONLY see B.Tech Civil students from Engineering school.

---

### **Step 4: Create ECE HOD Account**

| Field | Value |
|-------|-------|
| Email | `ece.hod@jecrc.ac.in` |
| Full Name | `Dr. Amit Verma` |
| Department | `school_hod` |
| **Schools** | ✅ Engineering |
| **Courses** | ✅ B.Tech |
| **Branches** | ✅ **ECE Only** |

---

### **Step 5: Create Engineering Dean Account**

**If you want a Dean to see ALL Engineering branches:**

| Field | Value |
|-------|-------|
| Email | `dean.engineering@jecrc.ac.in` |
| Full Name | `Dr. Pradeep Singh` |
| Department | `school_hod` |
| **Schools** | ✅ Engineering |
| **Courses** | ⬜ (Leave empty = All courses) |
| **Branches** | ⬜ (Leave empty = All branches) |

**Result:** Dean sees ALL Engineering students (CSE, Civil, ECE, Mechanical, etc.)

---

## 🔍 **HOW FILTERING WORKS**

### **Backend Logic:**

When CSE HOD logs in and views dashboard:

```javascript
// From: src/app/api/staff/dashboard/route.js (lines 136-152)

// 1. Get CSE HOD's profile
profile = {
  school_ids: ['<engineering-uuid>'],
  course_ids: ['<btech-uuid>'],
  branch_ids: ['<cse-uuid>']  // ← Only CSE
}

// 2. Apply filters to query
if (profile.school_ids && profile.school_ids.length > 0) {
  query = query.in('no_dues_forms.school_id', profile.school_ids);
}
if (profile.course_ids && profile.course_ids.length > 0) {
  query = query.in('no_dues_forms.course_id', profile.course_ids);
}
if (profile.branch_ids && profile.branch_ids.length > 0) {
  query = query.in('no_dues_forms.branch_id', profile.branch_ids);  // ← CSE only
}

// 3. Result: Only forms where branch_id = CSE
```

---

## 📊 **COMPLETE EXAMPLE SCENARIO**

### **Students Submit Forms:**

| Student | School | Course | Branch | Form Visible To |
|---------|--------|--------|--------|-----------------|
| Rahul | Engineering | B.Tech | CSE | ✅ CSE HOD only |
| Priya | Engineering | B.Tech | Civil | ✅ Civil HOD only |
| Amit | Engineering | B.Tech | ECE | ✅ ECE HOD only |
| Neha | Engineering | M.Tech | CSE | ✅ CSE HOD (if M.Tech selected) |
| Karan | Management | MBA | Finance | ❌ None of Engineering HODs |

### **What Each HOD Sees:**

**CSE HOD Dashboard:**
```
📋 My Applications (2)
─────────────────────────────
✓ Rahul Kumar - B.Tech CSE - Engineering
✓ Neha Sharma - M.Tech CSE - Engineering
```

**Civil HOD Dashboard:**
```
📋 My Applications (1)
─────────────────────────────
✓ Priya Singh - B.Tech Civil - Engineering
```

**Engineering Dean Dashboard:**
```
📋 My Applications (4)
─────────────────────────────
✓ Rahul Kumar - B.Tech CSE - Engineering
✓ Priya Singh - B.Tech Civil - Engineering
✓ Amit Patel - B.Tech ECE - Engineering
✓ Neha Sharma - M.Tech CSE - Engineering
```

---

## 🎨 **VISUAL CONFIGURATION**

### **Admin Panel View:**

```
╔════════════════════════════════════════════════════╗
║  Staff Account Configuration                       ║
╠════════════════════════════════════════════════════╣
║  Name: Dr. Rajesh Kumar                           ║
║  Email: cse.hod@jecrc.ac.in                       ║
║  Department: [▼ School HOD              ]         ║
║                                                    ║
║  Access Scope:                                     ║
║  ┌──────────────────────────────────────────────┐ ║
║  │ Schools:                                     │ ║
║  │ ☑ Engineering                                │ ║
║  │ ☐ Management                                 │ ║
║  │ ☐ Law                                        │ ║
║  └──────────────────────────────────────────────┘ ║
║                                                    ║
║  ┌──────────────────────────────────────────────┐ ║
║  │ Courses:                                     │ ║
║  │ ☑ B.Tech                                     │ ║
║  │ ☐ M.Tech                                     │ ║
║  │ ☐ Diploma                                    │ ║
║  └──────────────────────────────────────────────┘ ║
║                                                    ║
║  ┌──────────────────────────────────────────────┐ ║
║  │ Branches:                                    │ ║
║  │ ☑ CSE                          ← ONLY CSE    │ ║
║  │ ☐ Civil Engineering                          │ ║
║  │ ☐ ECE                                        │ ║
║  │ ☐ Mechanical                                 │ ║
║  └──────────────────────────────────────────────┘ ║
║                                                    ║
║  [Cancel]                      [Save Staff]       ║
╚════════════════════════════════════════════════════╝
```

---

## ✅ **VERIFICATION STEPS**

### **1. After Creating CSE HOD:**

```bash
# Login as: cse.hod@jecrc.ac.in
# Expected: Dashboard shows ONLY CSE students
```

**Test Checklist:**
- [ ] Login successful
- [ ] Dashboard shows forms count
- [ ] All visible forms have Branch = CSE
- [ ] No Civil/ECE/Mechanical forms visible
- [ ] Can approve/reject CSE forms only

### **2. After Creating Civil HOD:**

```bash
# Login as: civil.hod@jecrc.ac.in  
# Expected: Dashboard shows ONLY Civil students
```

**Test Checklist:**
- [ ] Dashboard shows Civil forms only
- [ ] No CSE forms visible
- [ ] Can approve/reject Civil forms only

### **3. Cross-Verification:**

| Action | Expected Result |
|--------|----------------|
| CSE student submits form | Appears in CSE HOD dashboard |
| Civil student submits form | Appears in Civil HOD dashboard |
| CSE HOD tries to see Civil form | ❌ Not visible |
| Civil HOD tries to see CSE form | ❌ Not visible |
| Dean views dashboard | ✅ Sees ALL branches |

---

## 🔧 **ADVANCED CONFIGURATIONS**

### **Multiple Branches HOD:**

If one HOD manages both CSE and IT:

```
Department: school_hod
Schools: Engineering
Courses: B.Tech
Branches: ✅ CSE, ✅ IT  ← Both selected
```

### **Multiple Courses HOD:**

If one HOD manages B.Tech and M.Tech CSE:

```
Department: school_hod
Schools: Engineering
Courses: ✅ B.Tech, ✅ M.Tech  ← Both selected
Branches: ✅ CSE
```

### **Full Access (Library/Hostel):**

Global departments see everyone:

```
Department: library
Schools: (empty) = All Schools
Courses: (empty) = All Courses
Branches: (empty) = All Branches
```

---

## 📝 **DEPARTMENT TYPES**

### **Branch-Specific Departments:**
- `school_hod` - Head of Department (branch-specific)
- `accounts` - Accounts (can be branch-specific)

### **Global Departments:**
- `library` - Library (sees all students)
- `hostel` - Hostel (sees all students)
- `it_department` - IT Department (sees all students)
- `exam_cell` - Exam Cell (sees all students)

---

## 🎯 **REAL-WORLD EXAMPLE**

### **JECRC Engineering Setup:**

**Branches:**
1. Computer Science (CSE)
2. Civil Engineering
3. Electronics & Communication (ECE)
4. Mechanical Engineering
5. Information Technology (IT)
6. Electrical Engineering (EE)

**HOD Configuration:**

```sql
-- CSE HOD
INSERT INTO profiles (email, department_name, school_ids, course_ids, branch_ids)
VALUES (
  'cse.hod@jecrc.ac.in',
  'school_hod',
  ARRAY['<engineering-uuid>'],
  ARRAY['<btech-uuid>'],
  ARRAY['<cse-branch-uuid>']
);

-- Civil HOD  
INSERT INTO profiles (email, department_name, school_ids, course_ids, branch_ids)
VALUES (
  'civil.hod@jecrc.ac.in',
  'school_hod',
  ARRAY['<engineering-uuid>'],
  ARRAY['<btech-uuid>'],
  ARRAY['<civil-branch-uuid>']
);

-- And so on for each branch...
```

---

## 🚀 **QUICK START GUIDE**

### **For Admin:**

1. **Run Migration:** Execute `scripts/add-staff-scope.sql`
2. **Configure Branches:** Admin → Settings → Branches
3. **Create HOD Accounts:** Admin → Settings → Staff Accounts
4. **Test:** Login as each HOD and verify filtering

### **For HOD:**

1. **Login:** Use provided credentials
2. **View Dashboard:** See only your branch students
3. **Process Forms:** Approve/reject as needed
4. **Search:** Search within your branch only

---

## ❓ **FAQ**

**Q: Can CSE HOD see Civil forms?**  
A: No, only CSE forms.

**Q: Can Dean see all branches?**  
A: Yes, if branches field is left empty.

**Q: Can one HOD manage multiple branches?**  
A: Yes, select multiple branches in configuration.

**Q: What if student changes branch?**  
A: Visibility updates automatically based on current branch.

**Q: Can HOD see students from other schools?**  
A: No, unless multiple schools are selected.

---

## ✅ **CURRENT STATUS**

| Item | Status |
|------|--------|
| Database schema | ✅ Ready (needs migration) |
| Backend API | ✅ Implemented |
| Frontend UI | ✅ Implemented |
| Filtering logic | ✅ Implemented |
| Testing | ⏳ Awaiting migration |

**Next Step:** Run the database migration and start configuring branch-specific HODs!

---

**This is exactly what you requested: CSE forms → CSE HOD, Civil forms → Civil HOD!**