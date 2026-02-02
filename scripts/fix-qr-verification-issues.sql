-- ============================================================================
-- FIX QR CODE VERIFICATION ISSUES
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ISSUE 1: blockchain_hash column is too short (truncating SHA256 hashes)
-- ISSUE 2: certificate_verifications table might not exist
-- ISSUE 3: Field name mismatches between database and API

-- PART 1: FIX BLOCKCHAIN HASH COLUMN LENGTH
-- SHA256 hashes are 64 characters long, but current data shows only 20 chars
ALTER TABLE no_dues_forms 
ALTER COLUMN blockchain_hash TYPE TEXT;  -- Remove any length limit

-- PART 2: ENSURE CERTIFICATE_VERIFICATIONS TABLE EXISTS
CREATE TABLE IF NOT EXISTS certificate_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
    transaction_id TEXT,
    verification_result TEXT NOT NULL CHECK (verification_result IN ('VALID', 'INVALID', 'TAMPERED', 'ERROR')),
    tampered_fields TEXT[],
    verified_by_ip TEXT,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificate_verifications_form_id ON certificate_verifications(form_id);
CREATE INDEX IF NOT EXISTS idx_certificate_verifications_result ON certificate_verifications(verification_result);

-- PART 3: CREATE OR REPLACE VERIFICATION FUNCTION FOR TESTING
-- This helps test the QR verification with real data
CREATE OR REPLACE FUNCTION test_certificate_verification(form_id_param UUID)
RETURNS TABLE(
    form_id UUID,
    student_name TEXT,
    registration_no TEXT,
    blockchain_hash TEXT,
    blockchain_tx TEXT,
    verification_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.student_name,
        f.registration_no,
        f.blockchain_hash,
        f.blockchain_tx,
        CASE 
            WHEN f.blockchain_hash IS NOT NULL AND f.blockchain_tx IS NOT NULL THEN 'READY_FOR_VERIFICATION'
            ELSE 'MISSING_BLOCKCHAIN_DATA'
        END as verification_status
    FROM no_dues_forms f
    WHERE f.id = form_id_param;
END;
$$ LANGUAGE plpgsql;

-- PART 4: REGENERATE BLOCKCHAIN HASHES FOR EXISTING CERTIFICATES
-- This will fix the truncated hashes issue
UPDATE no_dues_forms 
SET 
    blockchain_hash = encode(sha256(
        student_name::bytea || 
        registration_no::bytea || 
        course::bytea || 
        branch::bytea || 
        'completed'::bytea
    ), 'hex'),
    blockchain_verified = true
WHERE 
    final_certificate_generated = true 
    AND length(blockchain_hash) < 64;

-- PART 5: VERIFICATION QUERY TO CHECK FIXES
-- Run this after the script to verify everything is working
SELECT 
    '=== VERIFICATION RESULTS ===' as info;

SELECT 
    id,
    student_name,
    registration_no,
    length(blockchain_hash) as hash_length,
    blockchain_hash,
    blockchain_tx,
    final_certificate_generated,
    blockchain_verified
FROM no_dues_forms 
WHERE final_certificate_generated = true 
ORDER BY created_at DESC 
LIMIT 3;

SELECT 
    'certificate_verifications table exists:' as info,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'certificate_verifications'
    ) as table_exists;

-- Sample verification test
SELECT 
    'Test verification function:' as info,
    * FROM test_certificate_verification(
        (SELECT id FROM no_dues_forms WHERE final_certificate_generated = true LIMIT 1)
    );
