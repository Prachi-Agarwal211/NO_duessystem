-- Fix audit_logs table - make nullable columns have defaults
-- Run in Supabase SQL Editor

-- Step 1: Make nullable columns have defaults or be nullable
ALTER TABLE audit_logs ALTER COLUMN actor_name SET DEFAULT 'system';
ALTER TABLE audit_logs ALTER COLUMN actor_role SET DEFAULT 'system';
ALTER TABLE audit_logs ALTER COLUMN target_id SET DEFAULT NULL;
ALTER TABLE audit_logs ALTER COLUMN target_type SET DEFAULT NULL;
ALTER TABLE audit_logs ALTER COLUMN details SET DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ALTER COLUMN resource_id SET DEFAULT NULL;
ALTER TABLE audit_logs ALTER COLUMN old_values SET DEFAULT NULL;
ALTER TABLE audit_logs ALTER COLUMN new_values SET DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ALTER COLUMN ip_address SET DEFAULT NULL;
ALTER TABLE audit_logs ALTER COLUMN user_agent SET DEFAULT NULL;

-- Step 2: Verify the table structure
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Step 3: Test insert
-- INSERT INTO audit_logs (action, actor_id) VALUES ('TEST', 'aa1824d9-d7a5-400e-89cb-a99b1d2811fe');
