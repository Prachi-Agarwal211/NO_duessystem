# 9th Convocation Database Setup - Step-by-Step Commands

## Prerequisites
- Supabase project is set up
- You have access to Supabase SQL Editor
- You have the `fetch.csv` file ready

---

## STEP 1: Create the Convocation Table and Infrastructure

**Go to Supabase Dashboard → SQL Editor → New Query**

Copy and paste this COMPLETE SQL script:

```sql
-- ============================================================================
-- STEP 1: CREATE CONVOCATION ELIGIBLE STUDENTS TABLE
-- ============================================================================

-- Create enum for convocation status
CREATE TYPE convocation_status AS ENUM (
    'not_started',           -- Student hasn't started the no dues process
    'pending_online',        -- Online form submitted, awaiting clearances
    'pending_manual',        -- Manual entry submitted, awaiting clearances
    'completed_online',      -- All clearances approved via online form
    'completed_manual'       -- All clearances approved via manual entry
);

-- Create convocation eligible students table
CREATE TABLE IF NOT EXISTS public.convocation_eligible_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_no TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    school TEXT NOT NULL,
    admission_year TEXT NOT NULL,
    status convocation_status DEFAULT 'not_started',
    form_id UUID REFERENCES public.no_dues_forms(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_convocation_registration_no 
    ON public.convocation_eligible_students(registration_no);
CREATE INDEX IF NOT EXISTS idx_convocation_status 
    ON public.convocation_eligible_students(status);
CREATE INDEX IF NOT EXISTS idx_convocation_school 
    ON public.convocation_eligible_students(school);
CREATE INDEX IF NOT EXISTS idx_convocation_form_id 
    ON public.convocation_eligible_students(form_id);

-- Add comment for documentation
COMMENT ON TABLE public.convocation_eligible_students IS 
    '9th Convocation eligible students list. Auto-validates student registration during form submission.';

-- ============================================================================
-- STEP 2: CREATE TRIGGER TO AUTO-UPDATE CONVOCATION STATUS
-- ============================================================================

-- Function to update convocation status when form is submitted/updated
CREATE OR REPLACE FUNCTION public.update_convocation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the convocation status based on form status and type
    UPDATE public.convocation_eligible_students
    SET 
        form_id = NEW.id,
        status = CASE 
            -- When form is approved and all clearances are done
            WHEN NEW.status = 'approved' THEN
                CASE 
                    WHEN NEW.is_manual_entry THEN 'completed_manual'
                    ELSE 'completed_online'
                END
            -- When form is submitted but not yet approved
            WHEN NEW.status IN ('pending', 'submitted') THEN
                CASE 
                    WHEN NEW.is_manual_entry THEN 'pending_manual'
                    ELSE 'pending_online'
                END
            -- If form is rejected or cancelled, reset to not_started
            WHEN NEW.status IN ('rejected', 'cancelled') THEN 'not_started'
            ELSE status -- Keep existing status for other cases
        END,
        updated_at = NOW()
    WHERE registration_no = NEW.registration_no;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on no_dues_forms table
DROP TRIGGER IF EXISTS trigger_update_convocation_status ON public.no_dues_forms;
CREATE TRIGGER trigger_update_convocation_status
    AFTER INSERT OR UPDATE OF status ON public.no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_convocation_status();

-- ============================================================================
-- STEP 3: SETUP ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.convocation_eligible_students ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public to read (for validation API)
DROP POLICY IF EXISTS "Allow public read access" ON public.convocation_eligible_students;
CREATE POLICY "Allow public read access" 
    ON public.convocation_eligible_students
    FOR SELECT
    TO public
    USING (true);

-- Policy: Allow service role full access (for imports and updates)
DROP POLICY IF EXISTS "Allow service role full access" ON public.convocation_eligible_students;
CREATE POLICY "Allow service role full access" 
    ON public.convocation_eligible_students
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users (staff/admin) to read
DROP POLICY IF EXISTS "Allow authenticated users to read" ON public.convocation_eligible_students;
CREATE POLICY "Allow authenticated users to read" 
    ON public.convocation_eligible_students
    FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================================
-- STEP 4: ENABLE REALTIME FOR ADMIN DASHBOARD
-- ============================================================================

-- Enable realtime subscriptions for live updates in admin dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.convocation_eligible_students;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'convocation_eligible_students'
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'convocation_eligible_students';

-- Verify trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_convocation_status';

-- Check RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'convocation_eligible_students';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '✅ Convocation table and infrastructure created successfully!' as status;
```

---

## STEP 2: Import CSV Data

**After STEP 1 completes successfully**, you have **TWO OPTIONS** for importing the CSV data:

### Option A: Using Supabase Table Editor UI (RECOMMENDED - Easiest)

1. Go to **Supabase Dashboard → Table Editor**
2. Find and click on `convocation_eligible_students` table
3. Click **Insert** button → Select **Import data from CSV**
4. Upload your `fetch.csv` file
5. Map the CSV columns to database columns:
   - CSV `School` → Database `school`
   - CSV `Registration Number` → Database `registration_no`
   - CSV `Student Name` → Database `student_name`
   - CSV `Admission Year` → Database `admission_year`
6. Click **Import** and wait for completion

7. After import completes, run this SQL to set default status:

```sql
-- Set default status for all imported records
UPDATE public.convocation_eligible_students
SET status = 'not_started'
WHERE status IS NULL;

-- Verify import success
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT school) as unique_schools,
    COUNT(DISTINCT admission_year) as unique_years,
    status,
    COUNT(*) as count_by_status
FROM public.convocation_eligible_students
GROUP BY status;
```

### Option B: Using SQL COPY Command (For Direct Database Access)

If you have direct PostgreSQL access (not typical for Supabase):

```sql
-- Copy from CSV file (adjust path to your CSV location)
COPY public.convocation_eligible_students(school, registration_no, student_name, admission_year)
FROM '/path/to/fetch.csv'
DELIMITER ','
CSV HEADER;

-- Set default status
UPDATE public.convocation_eligible_students
SET status = 'not_started'
WHERE status IS NULL;
```

### Option C: Manual SQL INSERT (Backup Option)

If CSV import fails, use the `CONVOCATION_CSV_IMPORT.sql` file I created earlier with manual INSERT statements.

---

## STEP 3: Verify Everything Works

Run these queries in **SQL Editor** to verify the setup:

```sql
-- 1. Check total records imported
SELECT COUNT(*) as total_students 
FROM public.convocation_eligible_students;
-- Expected: 3094

-- 2. Check status distribution
SELECT status, COUNT(*) as count
FROM public.convocation_eligible_students
GROUP BY status
ORDER BY count DESC;
-- Expected: All 3094 should have 'not_started' status

-- 3. Check schools distribution
SELECT school, COUNT(*) as student_count
FROM public.convocation_eligible_students
GROUP BY school
ORDER BY student_count DESC;

-- 4. Check admission years
SELECT admission_year, COUNT(*) as student_count
FROM public.convocation_eligible_students
GROUP BY admission_year
ORDER BY admission_year;

-- 5. Test validation query (simulate what API will do)
SELECT 
    registration_no,
    student_name,
    school,
    admission_year,
    status
FROM public.convocation_eligible_students
WHERE registration_no = '22BCAN001'
LIMIT 1;
-- Expected: Should return Boliwal Chirag Chhitarmal from School of Computer Applications

-- 6. Verify trigger function exists and is working
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'update_convocation_status';
-- Expected: Should show the function definition

-- 7. Test realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE tablename = 'convocation_eligible_students';
-- Expected: Should show the table in supabase_realtime publication

-- 8. Verify RLS policies are active
SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN roles = '{public}' THEN 'Public Access'
        WHEN roles = '{authenticated}' THEN 'Authenticated Users'
        WHEN roles = '{service_role}' THEN 'Service Role'
        ELSE roles::text
    END as allowed_roles
FROM pg_policies
WHERE tablename = 'convocation_eligible_students';
-- Expected: Should show 3 policies (public read, service full, authenticated read)
```

---

## Expected Results After Setup

✅ **Table Created:** `convocation_eligible_students` with proper schema  
✅ **Records Imported:** 3,094 student records from CSV  
✅ **Status Initialized:** All records have `status = 'not_started'`  
✅ **Indexes Created:** 4 indexes for fast lookups on registration_no, status, school, form_id  
✅ **Trigger Active:** Auto-updates convocation status when no_dues_forms change  
✅ **RLS Enabled:** 3 policies (public read, authenticated read, service full access)  
✅ **Realtime Enabled:** Admin dashboard can subscribe to live updates  

---

## Troubleshooting Guide

### Problem: Import fails with "duplicate key" error

```sql
-- Solution: Clear existing data and try again
TRUNCATE public.convocation_eligible_students CASCADE;
-- Then re-import CSV
```

### Problem: CSV has wrong delimiter or encoding

```sql
-- Check your CSV structure first
-- Make sure it's comma-separated with these exact columns:
-- School,Registration Number,Student Name,Admission Year
```

### Problem: Trigger doesn't fire

```sql
-- Check if trigger is enabled
SELECT tgname, tgenabled, tgisinternal
FROM pg_trigger 
WHERE tgname = 'trigger_update_convocation_status';
-- tgenabled should be 'O' (enabled)

-- If disabled, enable it:
ALTER TABLE public.no_dues_forms 
ENABLE TRIGGER trigger_update_convocation_status;
```

### Problem: RLS blocks queries

```sql
-- Verify policies exist
SELECT * FROM pg_policies 
WHERE tablename = 'convocation_eligible_students';

-- Test with service role (should work):
SET ROLE service_role;
SELECT COUNT(*) FROM public.convocation_eligible_students;
RESET ROLE;
```

### Problem: Realtime not working

```sql
-- Check if table is in realtime publication
SELECT * FROM pg_publication_tables 
WHERE tablename = 'convocation_eligible_students';

-- If missing, add it:
ALTER PUBLICATION supabase_realtime 
ADD TABLE public.convocation_eligible_students;
```

### Problem: Need to reset everything

```sql
-- DANGER: This deletes everything! Use with caution.
DROP TABLE IF EXISTS public.convocation_eligible_students CASCADE;
DROP TYPE IF EXISTS convocation_status CASCADE;
DROP FUNCTION IF EXISTS public.update_convocation_status() CASCADE;

-- Then run STEP 1 again
```

---

## Sample Data for Testing

After import, you can use these registration numbers for testing:

```sql
-- Test valid registration numbers
SELECT * FROM public.convocation_eligible_students 
WHERE registration_no IN (
    '22BCAN001',  -- School of Computer Applications
    '20BMLTN001', -- School of Allied Health Sciences
    '21BRAN003'   -- School of Allied Health Sciences
);

-- Test invalid registration number (should return no results)
SELECT * FROM public.convocation_eligible_students 
WHERE registration_no = 'INVALID123';
```

---

## Performance Metrics

After setup, verify performance:

```sql
-- Check query speed (should be < 10ms)
EXPLAIN ANALYZE
SELECT * FROM public.convocation_eligible_students
WHERE registration_no = '22BCAN001';

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE tablename = 'convocation_eligible_students';
```

---

## Next Steps After Database Setup

Once you confirm all verification queries pass:

1. ✅ Database structure is ready with 3,094 records
2. ⏭️ **Next:** Create validation API endpoint (`/api/convocation/validate`)
3. ⏭️ Update student form with auto-fill on registration number blur
4. ⏭️ Create admin convocation dashboard with live status tracking
5. ⏭️ Test complete workflow end-to-end

---

## Quick Command Summary

```bash
# Step 1: Run in Supabase SQL Editor
# Copy entire STEP 1 SQL block → Paste → Run

# Step 2: Import CSV via Table Editor UI
# Table Editor → convocation_eligible_students → Insert → Import CSV

# Step 3: Set default status
UPDATE public.convocation_eligible_students SET status = 'not_started' WHERE status IS NULL;

# Step 4: Verify
SELECT COUNT(*) FROM public.convocation_eligible_students; -- Should be 3094
```

---

## Time Estimate

- **STEP 1 (Create Table):** ~1 minute
- **STEP 2 (Import CSV):** ~2-3 minutes for 3,094 records
- **STEP 3 (Verify):** ~1 minute
- **Total:** ~5 minutes

---

## Support

If you encounter any issues:
1. Check the Troubleshooting Guide above
2. Verify your CSV file format matches: `School,Registration Number,Student Name,Admission Year`
3. Ensure you have proper Supabase permissions
4. Check Supabase logs for detailed error messages

Ready to proceed! Run STEP 1 now and let me know when it completes successfully.
