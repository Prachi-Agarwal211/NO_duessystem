# Phase 1 Migration Guide

## Overview
This guide walks you through applying the database changes required for Phase 1: Student Portal Redesign. These changes enable students to submit and check No Dues applications without authentication, using only their registration number.

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before running migrations
2. **Service Role Key**: You need the service role key with admin permissions
3. **Test Environment**: Test in development before applying to production
4. **Downtime**: This migration should cause minimal downtime (< 1 minute)

## Database Changes Summary

### 1. Schema Changes
- Make `user_id` nullable in `no_dues_forms` table
- Add unique constraint on `registration_no`
- Add index on `registration_no` for faster lookups

### 2. RLS Policy Updates
- Remove authentication requirement for students
- Allow public access to form submission
- Allow public access to status checking
- Maintain existing staff/admin policies

### 3. New Functions
- `check_registration_exists(reg_no)` - Check if registration already exists
- `get_form_by_registration(reg_no)` - Get form by registration number
- `get_statuses_by_registration(reg_no)` - Get all department statuses

### 4. New View
- `form_status_summary` - Easy overview of all forms with status counts

## Migration Options

### Option 1: Supabase SQL Editor (Recommended)

This is the most reliable method:

1. **Open Supabase SQL Editor**
   ```
   https://app.supabase.com/project/YOUR_PROJECT_ID/sql
   ```

2. **Copy Migration SQL**
   - Open `supabase/migration-phase1.sql`
   - Copy entire contents

3. **Execute in SQL Editor**
   - Paste into SQL Editor
   - Click "Run" button
   - Verify all statements execute successfully

4. **Verify Changes**
   ```sql
   -- Check if user_id is nullable
   SELECT column_name, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'no_dues_forms' AND column_name = 'user_id';
   
   -- Check if unique constraint exists
   SELECT constraint_name 
   FROM information_schema.table_constraints 
   WHERE table_name = 'no_dues_forms' 
   AND constraint_type = 'UNIQUE';
   
   -- Check new policies
   SELECT policyname 
   FROM pg_policies 
   WHERE tablename = 'no_dues_forms';
   ```

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push
```

### Option 3: Migration Script (Experimental)

Use the provided Node.js script:

```bash
# Ensure you have .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=your_url
# SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Run migration script
node scripts/run-phase1-migration.js
```

**Note**: This method has limitations due to Supabase JS client restrictions. Option 1 (SQL Editor) is more reliable.

## Post-Migration Testing

### 1. Test Form Submission (No Auth)

```javascript
// Should work without authentication
const { data, error } = await supabase
  .from('no_dues_forms')
  .insert({
    registration_no: '21EJECS001',
    student_name: 'Test Student',
    session_from: '2021',
    session_to: '2025',
    // ... other fields
  });
```

### 2. Test Status Checking (No Auth)

```javascript
// Should work without authentication
const { data, error } = await supabase
  .from('no_dues_forms')
  .select(`
    *,
    department_statuses (*)
  `)
  .eq('registration_no', '21EJECS001')
  .single();
```

### 3. Test Staff Access (Auth Required)

```javascript
// Should still work with staff authentication
const { data, error } = await supabase
  .from('no_dues_status')
  .update({ status: 'approved' })
  .eq('id', 'status_id');
```

### 4. Test Duplicate Prevention

```javascript
// Should fail with unique constraint error
const { data, error } = await supabase
  .from('no_dues_forms')
  .insert({
    registration_no: '21EJECS001', // Already exists
    // ...
  });
// Expected error: duplicate key value violates unique constraint
```

## Rollback Plan

If you need to rollback the changes:

```sql
-- Rollback Script (run in Supabase SQL Editor)

-- 1. Drop new policies
DROP POLICY IF EXISTS "Anyone can create forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Anyone can view forms by registration_no" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Public cannot update forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Anyone can view all status" ON public.no_dues_status;
DROP POLICY IF EXISTS "Anyone can view notifications by form" ON public.notifications;

-- 2. Restore original policies
CREATE POLICY "Students can view own forms" ON public.no_dues_forms
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can update own forms" ON public.no_dues_forms
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view status for their forms" ON public.no_dues_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM no_dues_forms f
            WHERE f.id = public.no_dues_status.form_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM no_dues_forms f
            WHERE f.id = public.notifications.form_id
            AND f.user_id = auth.uid()
        )
    );

-- 3. Make user_id NOT NULL again (careful!)
-- Note: This will fail if there are any NULL user_id records
ALTER TABLE public.no_dues_forms 
ALTER COLUMN user_id SET NOT NULL;

-- 4. Drop unique constraint
ALTER TABLE public.no_dues_forms 
DROP CONSTRAINT IF EXISTS unique_registration_no;

-- 5. Drop new functions and view
DROP FUNCTION IF EXISTS check_registration_exists(TEXT);
DROP FUNCTION IF EXISTS get_form_by_registration(TEXT);
DROP FUNCTION IF EXISTS get_statuses_by_registration(TEXT);
DROP VIEW IF EXISTS public.form_status_summary;

-- 6. Drop new index
DROP INDEX IF EXISTS idx_no_dues_forms_registration_no;
```

## Verification Checklist

After migration, verify:

- [ ] Forms can be submitted without authentication
- [ ] Status can be checked by registration number only
- [ ] Duplicate registration numbers are prevented
- [ ] Staff can still login and update statuses
- [ ] Admin can still access admin dashboard
- [ ] Registrar can still view all forms
- [ ] No existing data was lost
- [ ] All RLS policies are working correctly

## Troubleshooting

### Issue: "user_id cannot be null"
**Solution**: Migration didn't complete. Run again or check if constraint was removed:
```sql
SELECT * FROM information_schema.columns 
WHERE table_name = 'no_dues_forms' AND column_name = 'user_id';
```

### Issue: "duplicate key value"
**Solution**: Good! The unique constraint is working. Each registration can only submit once.

### Issue: "permission denied for table"
**Solution**: Check RLS policies were created correctly:
```sql
SELECT * FROM pg_policies WHERE tablename IN ('no_dues_forms', 'no_dues_status');
```

### Issue: Staff cannot update statuses
**Solution**: Staff policies should still exist. Verify:
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'no_dues_status' 
AND policyname LIKE '%staff%';
```

## Support

If you encounter issues:

1. Check Supabase logs in dashboard
2. Review RLS policies in Table Editor
3. Test with SQL queries in SQL Editor
4. Ensure service role key is correct
5. Verify network connectivity to Supabase

## Next Steps After Migration

1. Update frontend components (already done in Phase 1)
2. Test end-to-end flow
3. Clean up old authentication pages
4. Update documentation
5. Deploy to production

---

**Migration File**: `supabase/migration-phase1.sql`  
**Migration Script**: `scripts/run-phase1-migration.js`  
**Created**: Phase 1 - Student Portal Redesign  
**Status**: Ready to apply