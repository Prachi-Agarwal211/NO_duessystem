# Critical Frontend Issues Report

## Summary
- **Total Files Audited**: 250 JavaScript/JSX files
- **Critical Issues**: 37
- **Warnings**: 300+ (mostly minor accessibility and best practice issues)

## Critical Issues (37) - MUST FIX

### 1. Missing `key` Props in Array Map Functions
**Impact**: React warnings, performance issues, broken UI updates
**Files Affected**:
- `src/app/staff/dashboard/page.js` - Line 0
- `src/app/student/check-status/page.js` - Line 0
- `src/components/admin/AdminDashboard.jsx` - Line 0
- `src/components/admin/AdminNotificationBell.jsx` - Line 0
- `src/components/admin/ApplicationsTable.jsx` - Line 0
- `src/components/admin/HierarchyTreeView.jsx` - Line 0
- `src/components/admin/settings/ConfigTable.jsx` - Line 0
- `src/components/admin/SupportTicketsTable.jsx` - Line 0
- `src/components/student/StatusTracker.jsx` - Line 0

**Fix**: Add unique `key` prop to all elements inside `.map()`:
```jsx
// ❌ Bad
{items.map(item => <div>{item.name}</div>)}

// ✅ Good
{items.map(item => <div key={item.id}>{item.name}</div>)}
```

---

### 2. `router.push` Without Error Handling
**Impact**: Unhandled navigation errors can crash the app
**Files Affected**:
- `src/components/support/AdminSupportModal.jsx:11`
- `src/components/support/DepartmentSupportModal.jsx:11`
- `src/components/support/StudentSupportModal.jsx:11`

**Fix**: Wrap router.push in try-catch:
```jsx
// ❌ Bad
router.push('/some-route');

// ✅ Good
try {
  await router.push('/some-route');
} catch (err) {
  console.error('Navigation failed:', err);
  toast.error('Failed to navigate');
}
```

---

### 3. Missing Button `type` Attribute
**Impact**: Buttons default to "submit", causing unexpected form submissions
**Files Affected** (Sample - 100+ instances):
- `src/components/admin/settings/ConfigModal.jsx:273`
- `src/components/admin/settings/ConfigModal.jsx:288`
- `src/components/admin/settings/ConfigModal.jsx:438`
- `src/components/student/ReapplyModal.jsx:299`
- `src/components/student/StatusTracker.jsx:282`
- `src/components/student/StatusTracker.jsx:402`
- `src/components/student/StatusTracker.jsx:463`

**Fix**: Always specify button type:
```jsx
// ❌ Bad
<button onClick={handleClick}>Click</button>

// ✅ Good
<button type="button" onClick={handleClick}>Click</button>
```

---

### 4. Form `onSubmit` Without `preventDefault`
**Impact**: Page reloads on form submission, losing all state
**Files Affected**:
- `src/components/admin/settings/ConfigModal.jsx:451`
- `src/components/chat/ChatInput.jsx:79`
- `src/components/staff/ForgotPasswordFlow.jsx:337`
- `src/components/staff/ForgotPasswordFlow.jsx:376`
- `src/components/staff/ForgotPasswordFlow.jsx:435`
- `src/components/student/OtpLoginForm.jsx:131`
- `src/components/student/OtpLoginForm.jsx:193`
- `src/components/student/SubmitForm.jsx:435`
- `src/components/support/CreateTicketModal.jsx:96`

**Fix**: Always prevent default form submission:
```jsx
// ❌ Bad
<form onSubmit={handleSubmit}>

// ✅ Good
<form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
```

---

### 5. Missing `await` on Async fetch Calls
**Impact**: Promises never resolve, data never loads
**Files Affected**:
- `src/components/student/ReapplyModal.jsx:161`
- `src/components/student/ReapplyModal.jsx:174`

**Fix**: Always await fetch calls:
```jsx
// ❌ Bad
const response = fetch('/api/endpoint');

// ✅ Good
const response = await fetch('/api/endpoint');
```

---

### 6. Async Functions Without Try-Catch
**Impact**: Unhandled promise rejections crash the app
**Files Affected**:
- `src/components/student/StatusTracker.jsx:0` - setupRealtime
- `src/components/student/SubmitForm.jsx:0` - loadCourses, loadBranches
- `src/hooks/useAdminDashboard.js:0` - handleLogout, setupRealtime
- `src/hooks/useStaffDashboard.js:0` - setupRealtime
- `src/lib/fileUpload.js:0` - validateAndUploadAlumniScreenshot

**Fix**: Wrap async operations in try-catch:
```jsx
// ❌ Bad
const setupRealtime = async () => {
  const channel = supabase.channel('test').subscribe();
};

// ✅ Good
const setupRealtime = async () => {
  try {
    const channel = supabase.channel('test').subscribe();
  } catch (err) {
    console.error('Realtime setup failed:', err);
  }
};
```

---

### 7. Missing Dependency Arrays in useEffect
**Impact**: Effects run on every render, causing infinite loops and performance issues
**Files Affected** (50+ instances):
- `src/components/landing/ActionCard.jsx:0`
- `src/components/landing/Background.jsx:0`
- `src/components/landing/EnhancedActionCard.jsx:0`
- `src/contexts/AuthContext.js:0`
- `src/contexts/ThemeContext.js:0`
- `src/hooks/useChat.js:0`
- `src/hooks/useStaffDashboard.js:0`

**Fix**: Always specify dependencies:
```jsx
// ❌ Bad
useEffect(() => {
  fetchData();
});

// ✅ Good
useEffect(() => {
  fetchData();
}, [fetchData]);
```

---

### 8. fetch() Without Try-Catch
**Impact**: Network errors crash the app
**Files Affected** (30+ instances):
- `src/components/admin/SupportTicketsTable.jsx:67`
- `src/components/student/StatusTracker.jsx:52`
- `src/components/student/StudentAuthGuard.jsx:24`
- `src/components/student/SubmitForm.jsx:357`
- `src/hooks/useAdminDashboard.js:110`
- `src/hooks/useChat.js:46`
- `src/hooks/useStaffDashboard.js:123`

**Fix**: Always wrap fetch in try-catch:
```jsx
// ❌ Bad
const data = await fetch('/api/endpoint');
const result = await data.json();

// ✅ Good
try {
  const data = await fetch('/api/endpoint');
  const result = await data.json();
} catch (err) {
  console.error('Fetch failed:', err);
  toast.error('Failed to load data');
}
```

---

## Warnings (300+) - Should Fix

### Accessibility Issues
- Missing `alt` attributes on images
- Missing `aria-label` on inputs
- Missing `role` on clickable divs

### Performance Issues
- useEffect without dependency arrays
- Inline function definitions in render

### Code Quality Issues
- Buttons without type attributes
- Potentially conflicting Tailwind classes
- Async functions without try-catch

---

## Recommended Priority

### 🔴 HIGH Priority (Fix First)
1. Missing `key` props in maps - Breaks React reconciliation
2. Missing `preventDefault` on forms - Causes page reloads
3. Missing `await` on fetch - Data never loads
4. Async without try-catch - App crashes

### 🟡 MEDIUM Priority
1. Missing button types - Unexpected form submissions
2. Missing dependency arrays - Performance issues
3. fetch without try-catch - Unhandled errors

### 🟢 LOW Priority
1. Accessibility warnings
2. Tailwind class conflicts
3. Code style issues

---

## Quick Fixes Script

Run this to find all critical issues:

```bash
# Find all map() without key
grep -r "\.map(" src --include="*.jsx" --include="*.js" | grep -v "key="

# Find all buttons without type
grep -r "<button" src --include="*.jsx" --include="*.js" | grep -v "type="

# Find all forms without preventDefault
grep -r "onSubmit=" src --include="*.jsx" --include="*.js" | grep -v "preventDefault"

# Find all useEffect without dependencies
grep -r "useEffect(()" src --include="*.jsx" --include="*.js" | grep -v "}, ["
```

---

## Files That Need Immediate Attention

1. `src/components/student/StatusTracker.jsx` - Multiple critical issues
2. `src/components/student/ReapplyModal.jsx` - Missing await, button types
3. `src/components/staff/ForgotPasswordFlow.jsx` - Form submission issues
4. `src/components/admin/settings/ConfigModal.jsx` - Form and button issues
5. `src/hooks/useStaffDashboard.js` - Async error handling
6. `src/hooks/useAdminDashboard.js` - Async error handling
