-- Fix audit_logs id column issue
-- Run in Supabase SQL Editor

-- Step 1: Add missing columns if not exists
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id TEXT;

-- Step 2: Check if id column has default
SELECT column_name, column_default, data_type
FROM information_schema.columns
WHERE table_name = 'audit_logs' AND column_name = 'id';

-- Step 3: If id doesn't have default, add it
ALTER TABLE audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Step 4: Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'audit_logs';

-- Step 5: Verify by testing insert (commented out)
-- INSERT INTO audit_logs (action, actor_id, details) VALUES ('TEST_INSERT', 'aa1824d9-d7a5-400e-89cb-a99b1d2811fe', '{"test": true}');
