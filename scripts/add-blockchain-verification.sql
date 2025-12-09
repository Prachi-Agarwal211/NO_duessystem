-- Add blockchain verification fields to no_dues_forms table
-- This enables tamper-proof certificate verification

-- Add blockchain columns
ALTER TABLE no_dues_forms 
ADD COLUMN IF NOT EXISTS blockchain_hash TEXT,
ADD COLUMN IF NOT EXISTS blockchain_tx TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS blockchain_block BIGINT,
ADD COLUMN IF NOT EXISTS blockchain_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;

-- Create index for faster verification lookups
CREATE INDEX IF NOT EXISTS idx_blockchain_tx 
ON no_dues_forms(blockchain_tx) 
WHERE blockchain_tx IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blockchain_hash 
ON no_dues_forms(blockchain_hash) 
WHERE blockchain_hash IS NOT NULL;

-- Create certificate verifications log table
CREATE TABLE IF NOT EXISTS certificate_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID REFERENCES no_dues_forms(id) ON DELETE CASCADE,
  verified_by UUID REFERENCES profiles(id),
  verification_method TEXT CHECK (verification_method IN ('qr_scan', 'manual', 'api')),
  verification_result JSONB NOT NULL,
  is_valid BOOLEAN NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create index for verification history
CREATE INDEX IF NOT EXISTS idx_verifications_form 
ON certificate_verifications(form_id, verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_verifications_user 
ON certificate_verifications(verified_by, verified_at DESC);

-- Add RLS policies for verification logs
ALTER TABLE certificate_verifications ENABLE ROW LEVEL SECURITY;

-- Admin can see all verification logs
CREATE POLICY "Admin can view all verifications"
  ON certificate_verifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Staff can see verifications they performed
CREATE POLICY "Staff can view their verifications"
  ON certificate_verifications
  FOR SELECT
  TO authenticated
  USING (
    verified_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Anyone authenticated can insert verification logs
CREATE POLICY "Authenticated users can create verifications"
  ON certificate_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    verified_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Add comment for documentation
COMMENT ON TABLE certificate_verifications IS 'Logs all certificate verification attempts for audit trail';
COMMENT ON COLUMN no_dues_forms.blockchain_hash IS 'SHA-256 hash of certificate data for integrity verification';
COMMENT ON COLUMN no_dues_forms.blockchain_tx IS 'Unique transaction ID (format: JECRC-YYYY-XXXXX-HASH)';
COMMENT ON COLUMN no_dues_forms.blockchain_block IS 'Block number (timestamp) when certificate was issued';
COMMENT ON COLUMN no_dues_forms.blockchain_verified IS 'Whether certificate has blockchain verification enabled';

-- Grant permissions
GRANT SELECT ON certificate_verifications TO authenticated;
GRANT INSERT ON certificate_verifications TO authenticated;