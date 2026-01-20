-- Create Audit Logs Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,           -- e.g., 'APPROVE_FORM', 'LOGIN'
    actor_id UUID,                  -- User ID who performed the action (nullable for system actions)
    resource_id UUID,               -- ID of the affected resource (e.g., form_id)
    details JSONB DEFAULT '{}',     -- Additional context (e.g., changed fields, reason)
    ip_address TEXT,                -- IP address of the actor
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key to profiles (optional, as actor might be deleted user)
    -- We use DO NOTHING on delete to keep the log history
    CONSTRAINT fk_actor
      FOREIGN KEY(actor_id) 
      REFERENCES public.profiles(id)
      ON DELETE SET NULL
);

-- Optimize queries on action type and actor
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON public.audit_logs(resource_id);

-- Enable RLS (Read-only for admins, No write access via API)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.audit_logs FOR SELECT 
TO authenticated 
USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- Policy: Service role can insert (API backend)
-- No public insert policy needed as we use Service Role in API

SELECT 'Audit Logs table created successfully' as status;
