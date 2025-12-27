# Add Design & Sciences Branches

This script adds new branches to existing courses in the JECRC No Dues System for Jaipur School of Design and School of Sciences.

## Overview

### ✅ Target Courses (Already Exist)
1. **M.Des** (Jaipur School of Design) - Currently has 2 branches
2. **B.Des** (Jaipur School of Design) - Currently has 7 branches
3. **M.Sc.** (School of Sciences) - Currently has 4 branches
4. **B.Sc.** (School of Sciences) - Currently has 9 branches

### 📝 New Branches to Add

#### Jaipur School of Design - M.Des (4 branches)
1. Graphic Design
2. Interior Design
3. Fashion Design
4. Jewellery Design

#### Jaipur School of Design - B.Des (1 branch)
1. Jewellery Design

#### School of Sciences - M.Sc. (8 branches)
1. Microbiology
2. Mathematics
3. Physics
4. Chemistry
5. Biotechnology
6. Forensic Science
7. Zoology
8. Botany

#### School of Sciences - B.Sc. (7 branches)
1. Microbiology
2. Mathematics
3. Physics
4. Chemistry
5. Biotechnology
6. Forensic Science
7. Pass Course

**Total: 20 new branches across 4 existing courses**

---

## Safety Features

✅ **Dry-run mode** - Preview all changes before applying
✅ **Course validation** - Verifies all target courses exist
✅ **Duplicate detection** - Checks for existing branches
✅ **School validation** - Verifies all target schools exist
✅ **Rollback on error** - Stops immediately if any operation fails
✅ **Comprehensive logging** - Detailed progress tracking
✅ **Data preservation** - All existing data is maintained

---

## Usage

### Step 1: Dry Run (REQUIRED FIRST STEP)

Always run in dry-run mode first to preview changes:

```bash
node scripts/add-design-sciences-courses-and-branches.js --dry-run
```

This will show you:
- Which courses will be updated
- Which branches will be added
- Current vs expected final counts
- Any potential issues (duplicates, missing schools, etc.)

### Step 2: Review the Output

Carefully review the dry-run output to ensure:
- The correct schools are targeted
- Course names match your expectations
- Branch names are correct
- No unexpected duplicates

### Step 3: Execute the Script

After reviewing the dry-run, execute the changes:

```bash
node scripts/add-design-sciences-courses-and-branches.js
```

---

## What the Script Does

### Phase 1: Course Validation
1. **Validates Environment**
   - Checks for required environment variables
   - Verifies database connection

2. **Validates Courses**
   - Searches for existing courses in both schools
   - Verifies all target courses exist
   - Maps all course IDs for branch insertion

### Phase 2: Branch Management
3. **Validates Current State**
   - Gets current branch counts for each course
   - Identifies any duplicate branch names

4. **Updates Display Orders**
   - Shifts existing branches down by the number of new branches
   - Ensures no conflicts in display order

5. **Inserts New Branches**
   - Adds new branches at positions 1, 2, 3, etc. (at the top)
   - Sets all new branches as active

6. **Verifies Changes**
   - Confirms all courses and branches were added successfully
   - Shows updated counts and sample branch lists

---

## Expected Results

### Branch Counts

| School → Course | Before | New | After | Change |
|-----------------|--------|-----|-------|--------|
| Jaipur School of Design → M.Des | 2 | +4 | 6 | ✅ +4 |
| Jaipur School of Design → B.Des | 7 | +1 | 8 | ✅ +1 |
| School of Sciences → M.Sc. | 4 | +8 | 12 | ✅ +8 |
| School of Sciences → B.Sc. | 9 | +7 | 16 | ✅ +7 |

**Total: 20 new branches**

---

## Database Changes

### Tables Modified

#### `config_branches`
- **Updated Records**: Existing branches (display_order incremented)
- **New Records**: 20 new branch records
- **Fields Modified/Set**:
  - `course_id` - Links to parent course
  - `name` - Branch name
  - `display_order` - Position in course (1-20 for new branches)
  - `is_active` - Set to `true`
  - `created_at` - Current timestamp
  - `updated_at` - Current timestamp

---

## Verification Queries

After running the script, verify the changes using these SQL queries:

### Check Branch Counts

```sql
-- Check branch counts per course in affected schools
SELECT 
  s.name as school_name,
  c.name as course_name,
  COUNT(b.id) as branch_count
FROM config_schools s
JOIN config_courses c ON c.school_id = s.id
LEFT JOIN config_branches b ON b.course_id = c.id
WHERE s.name IN ('Jaipur School of Design', 'School of Sciences')
GROUP BY s.name, c.name
ORDER BY s.name, c.name;
```

### View New Branches

```sql
-- View top 10 branches for each affected course
SELECT 
  s.name as school_name,
  c.name as course_name,
  b.name as branch_name,
  b.display_order,
  b.is_active,
  b.created_at
FROM config_schools s
JOIN config_courses c ON c.school_id = s.id
JOIN config_branches b ON b.course_id = c.id
WHERE s.name IN ('Jaipur School of Design', 'School of Sciences')
  AND b.display_order <= 10
ORDER BY s.name, c.name, b.display_order;
```

---

## Troubleshooting

### Error: "School not found"
**Cause:** School name doesn't match database exactly  
**Solution:** Check school names in database:
```sql
SELECT id, name FROM config_schools 
WHERE name LIKE '%Design%' OR name LIKE '%Science%';
```

### Error: "Course already exists"
**Cause:** M.Sc course already exists in the school  
**Solution:** The script will use the existing course - this is normal

### Error: "Duplicate branch name"
**Cause:** Branch already exists in the course  
**Solution:** The script will skip duplicates automatically - review dry-run output

### Error: "Missing environment variables"
**Solution:** Ensure `.env.local` file exists with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Error: "Database connection failed"
**Solution:** 
1. Check your Supabase project is active
2. Verify credentials are correct
3. Ensure you have internet connection

---

## Rollback

If you need to undo the changes:

### Option 1: Manual Rollback via SQL

```sql
-- Step 1: Delete the newly added branches
DELETE FROM config_branches 
WHERE name IN (
  -- Design school M.Sc branches
  'Graphic Design', 'Interior Design', 'Fashion Design',
  -- Design school B.Des branches  
  'Jewellery Design',
  -- Sciences M.Sc branches
  'Microbiology', 'Mathematics', 'Physics', 'Chemistry',
  'Biotechnology', 'Forensic Science', 'Zoology', 'Botany',
  -- Sciences B.Sc branches
  'Pass Course'
)
AND course_id IN (
  SELECT c.id 
  FROM config_courses c
  JOIN config_schools s ON s.id = c.school_id
  WHERE s.name IN ('Jaipur School of Design', 'School of Sciences')
);

-- Step 2: Delete newly created M.Sc courses (if needed)
-- WARNING: Only do this if the M.Sc courses were created by this script
DELETE FROM config_courses
WHERE name = 'M.Sc'
AND school_id IN (
  SELECT id FROM config_schools
  WHERE name IN ('Jaipur School of Design', 'School of Sciences')
);

-- Step 3: Restore original display orders
-- You'll need to adjust the shift counts based on how many branches were added
-- For B.Des (1 branch added):
UPDATE config_branches 
SET display_order = display_order - 1
WHERE course_id = (
  SELECT c.id FROM config_courses c
  JOIN config_schools s ON s.id = c.school_id
  WHERE c.name = 'B.Des - 4 Years' 
  AND s.name = 'Jaipur School of Design'
);

-- For M.Sc. (8 branches added):
UPDATE config_branches
SET display_order = display_order - 8
WHERE course_id = (
  SELECT c.id FROM config_courses c
  JOIN config_schools s ON s.id = c.school_id
  WHERE c.name = 'M.Sc.'
  AND s.name = 'School of Sciences'
);

-- For B.Sc. (7 branches added):
UPDATE config_branches 
SET display_order = display_order - 7
WHERE course_id = (
  SELECT c.id FROM config_courses c
  JOIN config_schools s ON s.id = c.school_id
  WHERE c.name = 'B.Sc.'
  AND s.name = 'School of Sciences'
);
```

### Option 2: Database Backup Restore

Restore from your most recent database backup before running the script.

---

## Important Notes

- **New branches appear at the top** of each course's branch list
- **All existing branches are preserved** with updated positions
- **The script uses transactions** for data safety where possible
- **Duplicate branches are automatically detected and skipped**
- **All timestamps are automatically updated**
- **Course names must match exactly** (case-sensitive, including periods)

---

## Support

If you encounter issues:

1. ✅ Check the troubleshooting section above
2. ✅ Run with `--dry-run` to identify problems
3. ✅ Review the console output for detailed error messages
4. ✅ Verify database schema matches expected structure
5. ✅ Check that schools exist in the database

---

## Files Created

- `scripts/add-design-sciences-courses-and-branches.js` - Main execution script
- `scripts/ADD-DESIGN-SCIENCES-README.md` - This documentation

---

**Script Version:** 1.0.0  
**Last Updated:** 2025-12-22  
**Author:** JECRC Development Team