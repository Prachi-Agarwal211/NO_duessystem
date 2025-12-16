/**
 * blockchainService.js
 * Handles certificate verification and QR code generation
 * Note: This is a placeholder for future blockchain integration
 * Currently uses database-backed verification
 */

import crypto from 'crypto';

/**
 * Generate QR data for certificate
 * @param {Object} certificateData - Certificate information
 * @returns {string} QR code data string
 */
export function generateQRData(certificateData) {
  const { id, student_name, enrollment_no, issued_at } = certificateData;
  
  // Create verification URL with certificate ID
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://nodues.jecrc.ac.in'}/verify/${id}`;
  
  // Generate hash for tamper detection
  const dataString = `${id}|${student_name}|${enrollment_no}|${issued_at}`;
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  
  return JSON.stringify({
    url: verificationUrl,
    id,
    hash: hash.substring(0, 16), // Shortened hash for QR
    timestamp: new Date(issued_at).getTime()
  });
}

/**
 * Verify certificate authenticity
 * @param {string} certificateId - Certificate ID to verify
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>} Verification result
 */
export async function verifyCertificate(certificateId, supabase) {
  try {
    // Query certificate from database
    const { data: certificate, error } = await supabase
      .from('certificates')
      .select(`
        id,
        student_name,
        enrollment_no,
        issued_at,
        certificate_type,
        student:student_id (
          email,
          phone
        )
      `)
      .eq('id', certificateId)
      .single();

    if (error || !certificate) {
      return {
        valid: false,
        message: 'Certificate not found or has been revoked'
      };
    }

    // Certificate is valid
    return {
      valid: true,
      certificate: {
        id: certificate.id,
        studentName: certificate.student_name,
        enrollmentNo: certificate.enrollment_no,
        issuedAt: certificate.issued_at,
        certificateType: certificate.certificate_type,
        studentEmail: certificate.student?.email,
        studentPhone: certificate.student?.phone
      },
      message: 'Certificate is authentic and valid'
    };

  } catch (error) {
    console.error('[blockchainService] Verification error:', error);
    return {
      valid: false,
      message: 'Verification failed due to technical error'
    };
  }
}

/**
 * Verify QR code data
 * @param {string} qrData - QR code data string
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>} Verification result
 */
export async function verifyQRData(qrData, supabase) {
  try {
    // Parse QR data
    const parsedData = JSON.parse(qrData);
    const { id, hash, timestamp } = parsedData;

    if (!id || !hash || !timestamp) {
      return {
        valid: false,
        message: 'Invalid QR code format'
      };
    }

    // Check if timestamp is reasonable (not too old, not in future)
    const now = Date.now();
    const qrAge = now - timestamp;
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    if (qrAge < 0 || qrAge > oneYear) {
      return {
        valid: false,
        message: 'QR code timestamp is invalid'
      };
    }

    // Verify certificate exists and matches hash
    const verificationResult = await verifyCertificate(id, supabase);
    
    if (!verificationResult.valid) {
      return verificationResult;
    }

    // Verify hash matches
    const cert = verificationResult.certificate;
    const dataString = `${cert.id}|${cert.studentName}|${cert.enrollmentNo}|${cert.issuedAt}`;
    const computedHash = crypto.createHash('sha256').update(dataString).digest('hex').substring(0, 16);

    if (computedHash !== hash) {
      return {
        valid: false,
        message: 'Certificate data has been tampered with'
      };
    }

    return verificationResult;

  } catch (error) {
    console.error('[blockchainService] QR verification error:', error);
    return {
      valid: false,
      message: 'QR code verification failed'
    };
  }
}

/**
 * Future: Store certificate hash on blockchain
 * Currently a placeholder for future blockchain integration
 */
export async function storeOnBlockchain(certificateData) {
  // TODO: Implement blockchain storage
  // For now, just log for future implementation
  console.log('[blockchainService] Blockchain storage not yet implemented for:', certificateData.id);
  return { success: true, txHash: 'mock-tx-hash' };
}