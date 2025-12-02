# 🎓 Complete HOD/Dean Configuration Guide

## Overview

The staff scope system supports **flexible access control** at three levels:
- **School Level** - See all courses and branches in a school
- **Course Level** - See all branches in specific courses
- **Branch Level** - See only specific branches

---

## 📋 Configuration Scenarios

### **1. Engineering School Scenarios**

#### **CSE HOD (Branch-Specific)**
```
Department: school_hod
Schools: ☑️ Engineering
Courses: ☑️ B.Tech
Branches: ☑️ Computer Science Engineering (CSE)
```
**Sees:** Only CSE students

#### **Civil HOD (Branch-Specific)**
```
Department: school_hod
Schools: ☑️ Engineering
Courses: ☑️ B.Tech
Branches: ☑️ Civil Engineering
```
**Sees:** Only Civil Engineering students

#### **B.Tech Dean (Course-Level)**
```
Department: dean
Schools: ☑️ Engineering
Courses: ☑️ B.Tech
Branches: ☐ (none selected)
```
**Sees:** ALL B.Tech branches (CSE, Civil, Mechanical, Electrical, etc.)

#### **Engineering Dean (School-Level)**
```
Department: dean
Schools: ☑️ Engineering
Courses: ☐ (none selected)
Branches: ☐ (none selected)
```
**Sees:** ALL courses and branches in Engineering (B.Tech, M.Tech, Ph.D.)

---

### **2. Management School Scenarios**

#### **MBA Program Head (Course-Level)**
```
Department: school_hod
Schools: ☑️ Management
Courses: ☑️ MBA
Branches: ☐ (none selected)
```
**Sees:** ALL MBA students (regardless of specialization)

#### **MBA Finance HOD (Branch-Specific)** *(if specializations exist)*
```
Department: school_hod
Schools: ☑️ Management
Courses: ☑️ MBA
Branches: ☑️ Finance
```
**Sees:** Only MBA Finance students

#### **MBA Marketing HOD (Branch-Specific)** *(if specializations exist)*
```
Department: school_hod
Schools: ☑️ Management
Courses: ☑️ MBA
Branches: ☑️ Marketing
```
**Sees:** Only MBA Marketing students

#### **Management School Dean (School-Level)**
```
Department: dean
Schools: ☑️ Management
Courses: ☐ (none selected)
Branches: ☐ (none selected)
```
**Sees:** ALL Management programs (MBA, BBA, Ph.D. Management, etc.)

---

### **3. Administrative Staff (Cross-School)**

#### **Library Staff**
```
Department: library
Schools: ☐ (none selected)
Courses: ☐ (none selected)
Branches: ☐ (none selected)
```
**Sees:** ALL students from ALL schools (no restrictions)

#### **Hostel Staff**
```
Department: hostel
Schools: ☐ (none selected)
Courses: ☐ (none selected)
Branches: ☐ (none selected)
```
**Sees:** ALL students from ALL schools (no restrictions)

#### **Accounts Department**
```
Department: accounts
Schools: ☐ (none selected)
Courses: ☐ (none selected)
Branches: ☐ (none selected)
```
**Sees:** ALL students from ALL schools (no restrictions)

---

## 🎯 Access Control Rules

### **Rule 1: Empty = Unrestricted**
- If NO schools selected → Sees ALL schools
- If NO courses selected → Sees ALL courses (within selected schools)
- If NO branches selected → Sees ALL branches (within selected courses)

### **Rule 2: Selection = Restriction**
- Schools selected → Restricted to those schools only
- Courses selected → Restricted to those courses only
- Branches selected → Restricted to those branches only

### **Rule 3: Cascade Filtering**
```
School Filter → Course Filter → Branch Filter
```
- Must have school to filter by course
- Must have course to filter by branch

---

## 📊 Common Configuration Patterns

### **Pattern A: Branch-Specific HOD**
```
✅ Select 1 School
✅ Select 1 Course
✅ Select 1 Branch
```
**Use Case:** CSE HOD, Civil HOD, MBA Finance HOD

### **Pattern B: Course-Level Dean**
```
✅ Select 1 School
✅ Select 1 Course
❌ No Branches
```
**Use Case:** B.Tech Dean, MBA Program Head

### **Pattern C: School-Level Dean**
```
✅ Select 1 School
❌ No Courses
❌ No Branches
```
**Use Case:** Engineering Dean, Management Dean

### **Pattern D: Multiple Branches (Same Course)**
```
✅ Select 1 School
✅ Select 1 Course
✅ Select Multiple Branches
```
**Use Case:** HOD managing both CSE and IT branches

### **Pattern E: Multiple Courses (Same School)**
```
✅ Select 1 School
✅ Select Multiple Courses
❌ No Branches
```
**Use Case:** Dean overseeing B.Tech and M.Tech

### **Pattern F: Cross-School (Administrative)**
```
❌ No Schools
❌ No Courses
❌ No Branches
```
**Use Case:** Library, Hostel, Accounts (see everyone)

---

## 🚀 Setup Steps

### **Step 1: Ensure Database Migration**
```sql
-- Run in Supabase SQL Editor
-- File: scripts/add-staff-scope.sql
```

### **Step 2: Access Admin Settings**
```
Login as Admin → Settings → Staff Accounts
```

### **Step 3: Create Staff Account**

1. **Click "Add Staff"**
2. **Fill Basic Info:**
   - Email: Any email (Gmail, Outlook, college email, etc.)
   - Name: Full Name
   - Department: Select role (school_hod, dean, library, etc.)

3. **Configure Access Scope:**
   - **Schools:** Check boxes for schools they should access
   - **Courses:** Check boxes for courses they should access
   - **Branches:** Check boxes for branches they should access

4. **Click Save**

### **Step 4: Verify**
- Login as the new staff member
- Check dashboard shows correct filtered students
- Verify no unauthorized students appear

---

## 🔍 Real-World Examples

### **Example 1: JECRC Engineering CSE HOD**
```
Email: cse.hod@jecrcu.edu.in (or john.doe@gmail.com, any email works!)
Department: school_hod
School: ✅ Faculty of Engineering & Technology
Course: ✅ B.Tech
Branch: ✅ Computer Science Engineering
```

### **Example 2: JECRC MBA Program Coordinator**
```
Email: mba.coordinator@jecrcu.edu.in (or priya.sharma@outlook.com)
Department: school_hod
School: ✅ Faculty of Management Studies
Course: ✅ MBA
Branch: ☐ (all MBA students)
```

### **Example 3: JECRC Engineering Dean**
```
Email: dean.engineering@jecrcu.edu.in (or any personal/work email)
Department: dean
School: ✅ Faculty of Engineering & Technology
Course: ☐ (all engineering courses)
Branch: ☐ (all engineering branches)
```

### **Example 4: JECRC Central Library**
```
Email: library@jecrcu.edu.in (or librarian123@gmail.com)
Department: library
School: ☐ (all schools)
Course: ☐ (all courses)
Branch: ☐ (all branches)
```

---

## ⚙️ Technical Details

### **Database Schema**
```sql
-- Staff table columns
school_ids    UUID[]  -- Array of school IDs (NULL = all schools)
course_ids    UUID[]  -- Array of course IDs (NULL = all courses)
branch_ids    UUID[]  -- Array of branch IDs (NULL = all branches)
```

### **Filtering Logic (Backend)**
```javascript
// If scope arrays are empty/null = no restriction
// If scope arrays have values = restrict to those values

if (staff.school_ids && staff.school_ids.length > 0) {
  query = query.in('school_id', staff.school_ids);
}

if (staff.course_ids && staff.course_ids.length > 0) {
  query = query.in('course_id', staff.course_ids);
}

if (staff.branch_ids && staff.branch_ids.length > 0) {
  query = query.in('branch_id', staff.branch_ids);
}
```

---

## 📌 Key Points

1. ✅ **MBA works exactly like other programs** - just configure at course or branch level
2. ✅ **Empty checkboxes = unrestricted access** - perfect for Library/Hostel
3. ✅ **Multiple selections supported** - HOD can manage multiple branches
4. ✅ **Flexible hierarchy** - Configure at school, course, or branch level
5. ✅ **No code changes needed** - All configuration via Admin UI
6. ✅ **Any email address works** - Staff can use Gmail, Outlook, college email, or any other email provider

---

## 🎯 Quick Reference

| Access Level | Select Schools | Select Courses | Select Branches | Example |
|--------------|---------------|----------------|-----------------|---------|
| **Global** | ❌ | ❌ | ❌ | Library, Hostel |
| **School** | ✅ | ❌ | ❌ | Engineering Dean |
| **Course** | ✅ | ✅ | ❌ | MBA Program Head |
| **Branch** | ✅ | ✅ | ✅ | CSE HOD |

---

## ✅ System Status

- ✅ Database schema ready
- ✅ Backend filtering implemented
- ✅ Admin UI with multi-select
- ✅ Supports ALL hierarchies (School/Course/Branch)
- ✅ Works for MBA, Engineering, and any other school
- ✅ Flexible enough for any organizational structure

**Total Configuration Time:** < 2 minutes per staff member

**Complexity:** Zero - just check boxes in UI! 🎉