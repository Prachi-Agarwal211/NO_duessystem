# Add New Branches Script

This script safely adds new branches to existing courses in the JECRC No Dues System.

## Overview

The script adds the following branches at the **top** of their respective course lists:

### B.Tech (8 new branches)
1. CSE AI/ML Xebia
2. CSE AI/ML IBM
3. CSE AI/ML Samatrix
4. CSE Fullstack - Xebia
5. CSE Cloud Computing - Microsoft
6. CSE Cloud Computing - AWS
7. CSE Blockchain - upGrad
8. CSE Data Science Samatrix

### MCA (2 new branches)
1. MCA Sunstone
2. MCA CollegeDekho

### BCA (2 new branches)
1. BCA Sunstone
2. BCA CollegeDekho

### BBA (3 new branches)
1. BBA - ISDC
2. BBA - Sunstone
3. BBA - CollegeDekho

### MBA (3 new branches)
1. MBA - ISDC
2. MBA - CollegeDekho
3. MBA - Sunstone

## Safety Features

✅ **Dry-run mode** - Preview changes before applying  
✅ **Duplicate detection** - Checks for existing branch names  
✅ **Course validation** - Verifies all target courses exist  
✅ **Rollback on error** - Stops immediately if any operation fails  
✅ **Comprehensive logging** - Detailed progress and verification  
✅ **Data preservation** - All existing branches are preserved  

## Usage

### Step 1: Dry Run (Recommended First)

Test the script without making any changes:

```bash
node scripts/add-new-branches-runner.js --dry-run
```

This will show you:
- What changes will be made
- Current branch counts
- Expected final counts
- Any potential issues (duplicates, missing courses, etc.)

### Step 2: Execute the Script

After reviewing the dry-run output, execute the actual changes:

```bash
node scripts/add-new-branches-runner.js
```

## What the Script Does

1. **Validates Environment**
   - Checks for required environment variables
   - Verifies database connection

2. **Validates Courses**
   - Confirms all target courses exist in the database
   - Verifies course IDs are correct

3. **Checks Current State**
   - Gets current branch counts for each course
   - Identifies any duplicate branch names

4. **Updates Display Orders**
   - Shifts existing branches down by the number of new branches
   - Ensures no conflicts in display order

5. **Inserts New Branches**
   - Adds new branches at positions 1, 2, 3, etc. (at the top)
   - Sets all new branches as active

6. **Verifies Changes**
   - Confirms all branches were added successfully
   - Shows updated branch counts
   - Displays sample of updated branch lists

## Expected Results

After running the script:

| Course | Before | New Branches | After | Change |
|--------|--------|--------------|-------|--------|
| B.Tech | 19     | +8           | 27    | ✅ +8  |
| MCA    | 2      | +2           | 4     | ✅ +2  |
| BCA    | 20     | +2           | 22    | ✅ +2  |
| BBA    | 10     | +3           | 13    | ✅ +3  |
| MBA    | 11     | +3           | 14    | ✅ +3  |

**Total: 18 new branches added**

## Database Changes

### Tables Modified
- `config_branches` - Updates display_order and inserts new records

### Fields Modified
- `display_order` - Incremented for existing branches
- `updated_at` - Updated timestamp for modified records

### New Records Created
- 18 new branch records with:
  - `course_id` - Links to parent course
  - `name` - Branch name
  - `display_order` - Position in list (1-8 for new branches)
  - `is_active` - Set to `true`
  - `created_at` - Current timestamp
  - `updated_at` - Current timestamp

## Verification Queries

After running the script, you can verify the changes using these SQL queries:

```sql
-- Check branch counts per course
SELECT 
  c.name as course_name,
  COUNT(b.id) as branch_count
FROM config_courses c
LEFT JOIN config_branches b ON b.course_id = c.id
WHERE c.name IN ('B.Tech', 'MCA', 'BCA', 'BBA', 'MBA')
GROUP BY c.name
ORDER BY c.name;

-- View top 5 branches for each course
SELECT 
  c.name as course_name,
  b.name as branch_name,
  b.display_order,
  b.is_active
FROM config_courses c
JOIN config_branches b ON b.course_id = c.id
WHERE c.name IN ('B.Tech', 'MCA', 'BCA', 'BBA', 'MBA')
  AND b.display_order <= 5
ORDER BY c.name, b.display_order;
```

## Troubleshooting

### Error: "Course not found"
**Solution:** Verify course IDs in the script match your database

### Error: "Duplicate branch name"
**Solution:** The branch already exists. The script will skip duplicates automatically.

### Error: "Missing environment variables"
**Solution:** Ensure `.env.local` file exists with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Error: "Database connection failed"
**Solution:** Check your Supabase project is active and credentials are correct

## Rollback

If you need to undo the changes:

1. **Manual Rollback via SQL:**
```sql
-- Delete the newly added branches
DELETE FROM config_branches 
WHERE name IN (
  'CSE AI/ML Xebia', 'CSE AI/ML IBM', 'CSE AI/ML Samatrix',
  'CSE Fullstack - Xebia', 'CSE Cloud Computing - Microsoft',
  'CSE Cloud Computing - AWS', 'CSE Blockchain - upGrad',
  'CSE Data Science Samatrix', 'MCA Sunstone', 'MCA CollegeDekho',
  'BCA Sunstone', 'BCA CollegeDekho', 'BBA - ISDC', 'BBA - Sunstone',
  'BBA - CollegeDekho', 'MBA - ISDC', 'MBA - CollegeDekho', 'MBA - Sunstone'
);

-- Restore original display orders
-- For B.Tech
UPDATE config_branches 
SET display_order = display_order - 8
WHERE course_id = '4070b71a-6a9a-4436-9452-f9ed8e97e1f1';

-- For MCA
UPDATE config_branches 
SET display_order = display_order - 2
WHERE course_id = '9fd733a2-7258-45ef-a725-3854b71dc972';

-- For BCA
UPDATE config_branches 
SET display_order = display_order - 2
WHERE course_id = 'afe542c8-a3e9-4dac-851f-9e583e8ae125';

-- For BBA
UPDATE config_branches 
SET display_order = display_order - 3
WHERE course_id = 'cd5e3027-5077-4593-bb1c-0e6345291689';

-- For MBA
UPDATE config_branches 
SET display_order = display_order - 3
WHERE course_id = 'fffc3234-e6e0-4466-891b-1acce82f143c';
```

2. **Database Backup Restore:**
   - Restore from your most recent database backup before running the script

## Files Created

- `scripts/add-new-branches.sql` - SQL script for manual execution
- `scripts/add-new-branches-runner.js` - Node.js runner with safety checks
- `scripts/ADD-NEW-BRANCHES-README.md` - This documentation file

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Run with `--dry-run` to identify problems
3. Review the console output for detailed error messages
4. Verify database schema matches expected structure

## Notes

- New branches appear at the **top** of each course's branch list
- All existing branches are **preserved** with updated positions
- The script uses **transactions** for data safety
- Duplicate branches are automatically **detected and skipped**
- All timestamps are **automatically updated**

---

**Last Updated:** 2025-12-20  
**Script Version:** 1.0.0  
**Author:** JECRC Development Team