# Convocation Auto-fill Validation Fix

## Problem Identified
When students use the "Fetch Details" button to auto-fill their form with convocation data, form submission fails with:
```
Admission Year must be in YYYY format (e.g., 2020)
```

## Root Cause Analysis

### 1. **State Update Timing Issue**
The validation runs BEFORE React state updates complete:
- Line 185: `admission_year: result.student.admission_year` - Sets state
- Line 328: `handleSubmit` validation - Runs immediately
- **Problem**: React state updates are asynchronous - validation may run on OLD state

### 2. **Potential Hidden Characters**
CSV data shows some trailing spaces in names (e.g., `"Manish Ghoslya "`)
While admission_year looks clean, there could be:
- Invisible unicode characters
- Carriage returns (`\r`)
- Non-breaking spaces
- Leading/trailing whitespace

### 3. **No Sanitization on Auto-fill**
Current code (line 185):
```javascript
admission_year: result.student.admission_year || formData.admission_year
```
- No `.trim()`
- No type checking
- No format validation

## The Fix

### Step 1: Add Sanitization to Auto-fill Logic

**File**: `src/components/student/SubmitForm.jsx`

**Location**: Lines 177-230 (validateConvocation function)

**Replace lines 183-186 with**:
```javascript
// ==================== AUTO-FILL FORM DATA WITH SANITIZATION ====================
// Sanitize and validate data before setting state
const sanitizedName = result.student.name ? result.student.name.trim() : formData.student_name;
const sanitizedYear = result.student.admission_year 
  ? result.student.admission_year.toString().trim().replace(/\D/g, '') // Remove non-digits
  : formData.admission_year;

const updates = {
  student_name: sanitizedName,
  admission_year: sanitizedYear
};
```

### Step 2: Add Validation Feedback

**Add after line 225** (before setFormData):
```javascript
// Validate sanitized year before setting state
if (sanitizedYear && !/^\d{4}$/.test(sanitizedYear)) {
  logger.warn('Invalid admission year from convocation', {
    original: result.student.admission_year,
    sanitized: sanitizedYear,
    registration_no
  });
  setConvocationError('Invalid admission year format in convocation data. Please enter manually.');
  return;
}
```

### Step 3: Complete Fixed Function

Replace the entire `validateConvocation` function (lines 160-247) with:

```javascript
// Validate registration number against convocation database
const validateConvocation = async (registration_no) => {
  if (!registration_no || !registration_no.trim()) {
    return;
  }

  setValidatingConvocation(true);
  setConvocationError('');
  
  try {
    const response = await fetch('/api/convocation/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_no: registration_no.trim().toUpperCase() })
    });

    const result = await response.json();

    if (result.valid && result.student) {
      setConvocationValid(true);
      setConvocationData(result.student);
      
      // ==================== AUTO-FILL FORM DATA WITH SANITIZATION ====================
      // Sanitize and validate data before setting state
      const sanitizedName = result.student.name ? result.student.name.trim() : formData.student_name;
      const sanitizedYear = result.student.admission_year 
        ? result.student.admission_year.toString().trim().replace(/\D/g, '') // Remove non-digits and whitespace
        : formData.admission_year;

      // Validate sanitized year format
      if (sanitizedYear && !/^\d{4}$/.test(sanitizedYear)) {
        logger.warn('Invalid admission year from convocation', {
          original: result.student.admission_year,
          sanitized: sanitizedYear,
          registration_no
        });
        setConvocationError('Invalid admission year format in convocation data. Please enter year manually.');
        setConvocationValid(false);
        setValidatingConvocation(false);
        return;
      }

      const updates = {
        student_name: sanitizedName,
        admission_year: sanitizedYear
      };
      
      // Auto-fill school dropdown using fuzzy matching
      if (result.student.school && schools.length > 0) {
        const convocationSchoolName = result.student.school.toLowerCase().trim();
        
        // Try exact match first
        let matchedSchool = schools.find(s =>
          s.name.toLowerCase().trim() === convocationSchoolName
        );
        
        // If no exact match, try partial match (contains)
        if (!matchedSchool) {
          matchedSchool = schools.find(s =>
            s.name.toLowerCase().includes(convocationSchoolName) ||
            convocationSchoolName.includes(s.name.toLowerCase())
          );
        }
        
        // If school matched, set the UUID
        if (matchedSchool) {
          updates.school = matchedSchool.id;
          logger.debug('School auto-filled', {
            convocationSchool: result.student.school,
            matchedSchool: matchedSchool.name,
            schoolId: matchedSchool.id
          });
        } else {
          logger.warn('Could not auto-fill school - no match found', {
            convocationSchool: result.student.school,
            availableSchools: schools.map(s => s.name)
          });
        }
      }
      
      // Apply all updates at once
      setFormData(prev => ({
        ...prev,
        ...updates
      }));
      
      logger.success('Convocation validation successful - form auto-filled', {
        registration_no,
        autoFilled: Object.keys(updates),
        sanitizedData: {
          name: sanitizedName,
          year: sanitizedYear
        }
      });
    } else {
      setConvocationValid(false);
      setConvocationError(result.error || 'Registration number not eligible for 9th convocation. Kindly contact admin');
      logger.warn('Convocation validation failed', { registration_no, error: result.error });
    }
  } catch (error) {
    console.error('Convocation validation error:', error);
    setConvocationValid(false);
    setConvocationError('Failed to validate registration number. Please try again.');
    logger.error(error, {
      action: 'validateConvocation',
      registration_no
    });
  } finally {
    setValidatingConvocation(false);
  }
};
```

## What This Fix Does

### 1. **Sanitization** (Line 183-188)
- Trims all whitespace from name and year
- Removes ALL non-digit characters from year using `.replace(/\D/g, '')`
- Converts year to string before processing
- Handles null/undefined values gracefully

### 2. **Pre-validation** (Line 190-199)
- Validates year format BEFORE setting state
- Prevents invalid data from entering form state
- Shows clear error message to user
- Returns early if validation fails

### 3. **Better Logging** (Line 246-251)
- Logs both original and sanitized values
- Helps debug if issues persist
- Tracks what data was auto-filled

## Testing Steps

1. **Clear Browser Cache**: `Ctrl+Shift+Delete` → Clear all
2. **Test with Known Registration Numbers**:
   - `20BMLTN001` - Should auto-fill: Name="Manish Ghoslya", Year="2020"
   - `22BPSN001` - Should auto-fill: Name="Ridhima Sharma", Year="2022"
   - `21BRAC022` - Should auto-fill: Name="Yashwant Singh Rathore", Year="2021"

3. **Verify**:
   - ✅ Name field populates (trimmed, no trailing spaces)
   - ✅ Admission year field shows exactly 4 digits
   - ✅ Form submits successfully without validation errors
   - ✅ Green "Eligible" badge appears
   - ✅ Convocation details box shows correct info

## Additional Safeguards

### If Issues Persist

**Check Database**:
```sql
-- Verify admission_year has no hidden characters
SELECT 
  registration_no,
  student_name,
  admission_year,
  LENGTH(admission_year) as year_length,
  ASCII(SUBSTRING(admission_year FROM 1 FOR 1)) as first_char_ascii
FROM convocation_eligible_students
WHERE registration_no IN ('20BMLTN001', '22BPSN001', '21BRAC022');
```

Expected output:
- `year_length` = 4
- `first_char_ascii` = 50 (ASCII for '2')

**If length ≠ 4**: Data has hidden characters, run:
```sql
UPDATE convocation_eligible_students
SET admission_year = REGEXP_REPLACE(admission_year, '[^0-9]', '', 'g');
```

## Files Modified

1. ✅ `src/components/student/SubmitForm.jsx` - Added sanitization and pre-validation

## Production Deployment

```bash
# 1. Commit changes
git add src/components/student/SubmitForm.jsx
git commit -m "fix: sanitize convocation auto-fill data to prevent validation errors"

# 2. Push to production
git push origin main

# 3. Verify on Vercel
# Auto-deploys on push - check deployment logs
```

## Expected Result

✅ **Before Fix**: Form submission fails with "Admission Year must be in YYYY format"
✅ **After Fix**: Form auto-fills and submits successfully with clean data

## Rollback Plan

If issues occur:
```bash
git revert HEAD
git push origin main
```

---

**Status**: Ready for implementation
**Priority**: HIGH - Blocking convocation students from submitting forms
**ETA**: 5 minutes to implement + 5 minutes testing