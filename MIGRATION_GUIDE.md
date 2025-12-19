# 🚀 Support System Migration Guide

## 📋 Two Migration Strategies

### **Option 1: Fresh Start** (Recommended for NEW deployments)
**Use this if:** You don't have any existing support tickets data OR you want to start fresh.

### **Option 2: Safe Migration** (Recommended for EXISTING data)
**Use this if:** You already have a support_tickets table with data you want to keep.

---

## 🔥 OPTION 1: Fresh Start (Clean Install)

This completely removes existing tables and creates new ones.

### Step 1: Open the SQL file
Open [`database_migration_support_tickets_simple.sql`](database_migration_support_tickets_simple.sql)

### Step 2: Uncomment the DROP statements
Find these lines near the top (around line 12-13):

```sql
-- DROP TABLE IF EXISTS support_messages CASCADE;
-- DROP TABLE IF EXISTS support_tickets CASCADE;
```

**Remove the `--` to uncomment them:**

```sql
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
```

### Step 3: Run in Supabase
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the ENTIRE modified SQL file
3. Paste and click **"Run"**
4. Wait for success message

### Step 4: Verify
Run this query to confirm tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('support_tickets', 'support_messages');
```

Expected output:
```
support_tickets
support_messages
```

---

## 🛡️ OPTION 2: Safe Migration (Preserve Existing Data)

This safely adds missing columns and updates the schema WITHOUT deleting data.

### Step 1: Run the SQL file AS-IS
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the ENTIRE content of [`database_migration_support_tickets_simple.sql`](database_migration_support_tickets_simple.sql)
3. Paste and click **"Run"**
4. Wait for success message

**What it does:**
- ✅ Creates tables if they don't exist
- ✅ Adds missing columns to existing tables
- ✅ Renames `email` → `user_email` if needed
- ✅ Creates indexes for performance
- ✅ Sets up auto-update triggers
- ✅ **PRESERVES all existing data**

### Step 2: Verify the migration
Run this query to check the table structure:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'support_tickets'
ORDER BY ordinal_position;
```

### Step 3: Check existing data (if any)
```sql
SELECT COUNT(*), requester_type, status
FROM support_tickets
GROUP BY requester_type, status;
```

---

## 🧹 Cleanup Old Constraints (Optional)

If your existing table has complex constraints (enums, foreign keys, etc.), you may need to remove them.

### Check for enum types:
```sql
SELECT typname FROM pg_type WHERE typname LIKE '%ticket%';
```

### Remove enum types (if found):
```sql
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS ticket_priority CASCADE;
DROP TYPE IF EXISTS ticket_category CASCADE;
```

### Remove foreign key constraints (if any):
```sql
-- List all foreign keys
SELECT conname FROM pg_constraint WHERE conrelid = 'support_tickets'::regclass;

-- Remove specific constraints (replace 'constraint_name' with actual name)
-- ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS constraint_name;
```

---

## ✅ Verification Checklist

After running the migration, verify everything works:

### 1. Check table structure
```sql
\d support_tickets
```

Expected key columns:
- `id` (UUID, PRIMARY KEY)
- `ticket_number` (VARCHAR, UNIQUE)
- `user_email` (VARCHAR, NOT NULL) ← **Not "email"**
- `message` (TEXT, NOT NULL)
- `requester_type` (VARCHAR)
- `status` (VARCHAR)

### 2. Test insert
```sql
INSERT INTO support_tickets (user_email, message, requester_type)
VALUES ('test@example.com', 'This is a test ticket', 'student');
```

### 3. Test select
```sql
SELECT ticket_number, user_email, message, status, requester_type
FROM support_tickets
ORDER BY created_at DESC
LIMIT 5;
```

### 4. Test update
```sql
UPDATE support_tickets
SET status = 'in_progress'
WHERE user_email = 'test@example.com';
```

### 5. Clean up test data
```sql
DELETE FROM support_tickets WHERE user_email = 'test@example.com';
```

---

## 🚨 Troubleshooting

### Problem: "column 'email' does not exist"
**Solution:** The migration should auto-rename `email` to `user_email`. If it didn't, run:
```sql
ALTER TABLE support_tickets RENAME COLUMN email TO user_email;
```

### Problem: "type 'ticket_status' already exists"
**Solution:** Your old schema used enum types. Remove them:
```sql
-- First, change columns to plain VARCHAR
ALTER TABLE support_tickets ALTER COLUMN status TYPE VARCHAR(50);
ALTER TABLE support_tickets ALTER COLUMN priority TYPE VARCHAR(50);
ALTER TABLE support_tickets ALTER COLUMN category TYPE VARCHAR(100);

-- Then drop the enum types
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS ticket_priority CASCADE;
DROP TYPE IF EXISTS ticket_category CASCADE;
```

### Problem: "foreign key constraint violation"
**Solution:** Remove foreign key constraints:
```sql
-- List constraints
SELECT conname FROM pg_constraint WHERE conrelid = 'support_tickets'::regclass;

-- Drop them (replace with actual constraint names)
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS fk_user_id;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS fk_assigned_to;
```

### Problem: Migration seems stuck
**Solution:** Check for active transactions:
```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

Kill stuck queries if needed (use with caution):
```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query LIKE '%support_tickets%';
```

---

## 🔄 Complete Rollback (Emergency Only)

If something goes wrong and you need to completely undo the migration:

```sql
-- WARNING: This deletes ALL support ticket data!
DROP TRIGGER IF EXISTS set_support_tickets_updated_at ON support_tickets;
DROP FUNCTION IF EXISTS update_support_tickets_updated_at();
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
```

Then start fresh with Option 1.

---

## 📊 Migration Comparison

| Feature | Option 1: Fresh Start | Option 2: Safe Migration |
|---------|----------------------|-------------------------|
| **Speed** | ⚡ Fast | 🐢 Slower |
| **Data Loss** | ❌ All data deleted | ✅ No data loss |
| **Risk** | ⚠️ High (data loss) | ✅ Low (preserves data) |
| **Use Case** | New deployment | Existing deployment |
| **Recommended For** | Development/Testing | Production |

---

## 🎯 Which Option Should You Choose?

### Choose **OPTION 1** (Fresh Start) if:
- ✅ This is a new deployment
- ✅ You're in development/testing phase
- ✅ You have no existing support tickets
- ✅ You want the cleanest possible schema

### Choose **OPTION 2** (Safe Migration) if:
- ✅ You have existing support tickets
- ✅ You're in production
- ✅ You can't afford to lose data
- ✅ You're not sure what's in the database

**When in doubt, choose Option 2** - it's safer! 🛡️

---

## 📝 Next Steps After Migration

1. ✅ Verify the migration using the checklist above
2. ✅ Test the API endpoints:
   - `/api/support/submit` (POST)
   - `/api/support/my-tickets` (GET)
   - `/api/support` (GET/PATCH)
3. ✅ Test the UI pages:
   - `/student/support`
   - `/staff/support`
   - `/admin/support`
4. ✅ Check that filtering works (student vs department tickets)
5. ✅ Test status updates from admin panel

---

**Last Updated:** 19 January 2025  
**Migration File:** [`database_migration_support_tickets_simple.sql`](database_migration_support_tickets_simple.sql)  
**Implementation Guide:** [`SUPPORT_SYSTEM_IMPLEMENTATION.md`](SUPPORT_SYSTEM_IMPLEMENTATION.md)