# Supabase Database Migrations Needed

## Issues Found

### 1. Chat Not Working (500 Error)
**Root Cause:** `no_dues_messages.id` column is missing `DEFAULT gen_random_uuid()`

**Error:** `null value in column "id" violates not-null constraint`

**Fix:** Add default UUID generation to the id column:
```sql
ALTER TABLE no_dues_messages 
ALTER COLUMN id SET DEFAULT gen_random_uuid();
```

### 2. Missing Columns in no_dues_forms
The following columns are referenced in the code but missing from the database:
- `unread_count` (INTEGER)
- `department_unread_counts` (JSONB)

**Fix:**
```sql
ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;
ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS department_unread_counts JSONB DEFAULT '{}'::jsonb;
```

## Migrations to Run

Run these in Supabase SQL Editor (in order):

### Migration 1: Fix no_dues_messages id column
```sql
-- Fix no_dues_messages id column to have default value
ALTER TABLE no_dues_messages 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'no_dues_messages' AND column_name = 'id';
```

### Migration 2: Add missing columns to no_dues_forms
```sql
-- Add unread_count column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' AND column_name = 'unread_count'
    ) THEN
        ALTER TABLE no_dues_forms ADD COLUMN unread_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' AND column_name = 'department_unread_counts'
    ) THEN
        ALTER TABLE no_dues_forms ADD COLUMN department_unread_counts JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Update existing rows
UPDATE no_dues_forms SET unread_count = 0 WHERE unread_count IS NULL;
UPDATE no_dues_forms SET department_unread_counts = '{}'::jsonb WHERE department_unread_counts IS NULL;
```

## Verification

After running migrations, verify with:
```bash
node scripts/test-message-insert.js
node scripts/check-actual-columns.js
```

## Notes

- All existing data is preserved (ALTER TABLE ADD COLUMN is non-destructive)
- The `no_dues_status` table already has `unread_count` - no action needed
- Student data table (29,044 students) is intact
- 1 no_dues_form exists
- 7 no_dues_status records exist
