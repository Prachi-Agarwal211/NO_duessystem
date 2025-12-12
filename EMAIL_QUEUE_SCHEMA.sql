-- ========================================
-- EMAIL QUEUE SYSTEM FOR VERCEL DEPLOYMENT
-- ========================================
-- This table manages email delivery with retry logic
-- Compatible with Vercel serverless functions
-- Processed by cron job every 5 minutes

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT valid_attempts CHECK (attempts >= 0),
  CONSTRAINT valid_retries CHECK (max_retries >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_attempts ON email_queue(attempts) WHERE status = 'pending';

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_email_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_queue_update_timestamp
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_timestamp();

-- Function to cleanup old completed/failed emails (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_emails()
RETURNS void AS $$
BEGIN
  DELETE FROM email_queue
  WHERE status IN ('completed', 'failed', 'cancelled')
  AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to email queue"
  ON email_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Prevent public access
CREATE POLICY "No public access to email queue"
  ON email_queue
  FOR ALL
  TO PUBLIC
  USING (false);

-- Grant necessary permissions
GRANT ALL ON email_queue TO service_role;

-- Email queue statistics view
CREATE OR REPLACE VIEW email_queue_stats AS
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest,
  AVG(attempts) as avg_attempts
FROM email_queue
GROUP BY status;

GRANT SELECT ON email_queue_stats TO service_role;

-- Comments for documentation
COMMENT ON TABLE email_queue IS 'Queue for email delivery with retry logic, compatible with Vercel serverless functions';
COMMENT ON COLUMN email_queue.status IS 'pending: not sent yet, processing: currently sending, completed: successfully sent, failed: all retries exhausted, cancelled: manually cancelled';
COMMENT ON COLUMN email_queue.attempts IS 'Number of delivery attempts made';
COMMENT ON COLUMN email_queue.max_retries IS 'Maximum number of retry attempts allowed';
COMMENT ON COLUMN email_queue.scheduled_for IS 'When this email should be sent (allows delayed delivery)';
COMMENT ON COLUMN email_queue.metadata IS 'Additional data: form_id, student_name, etc.';