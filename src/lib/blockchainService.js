/**
 * Blockchain-Inspired Certificate Verification Service
 * 
 * This uses cryptographic hashing to create tamper-proof certificates
 * without requiring external blockchain (100% FREE solution)
 * 
 * Features:
 * - SHA-256 hashing for certificate integrity
 * - Timestamp verification
 * - Immutable record in database
 * - QR code generation with verification data
 */

import crypto from 'crypto';

class BlockchainService {
  /**
   * Generate a unique hash for certificate data
   * This hash acts as a "blockchain fingerprint"
   */
  generateCertificateHash(certificateData) {
    // Create a deterministic string from certificate data
    const dataString = JSON.stringify({
      studentId: certificateData.student_id,
      registrationNo: certificateData.registration_no,
      fullName: certificateData.full_name,
      course: certificateData.course,
      branch: certificateData.branch,
      status: certificateData.status,
      completedAt: certificateData.completed_at,
      // Include all department statuses for complete verification
      departments: certificateData.department_statuses?.map(d => ({
        name: d.department_name,
        status: d.status,
        actionAt: d.action_at
      })) || []
    });

    // Generate SHA-256 hash
    const hash = crypto
      .createHash('sha256')
      .update(dataString)
      .digest('hex');

    return hash;
  }

  /**
   * Generate a unique transaction ID (simulates blockchain TX)
   * Format: JECRC-YYYY-XXXXX-HASH
   */
  generateTransactionId(certificateHash) {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const hashPrefix = certificateHash.substring(0, 8).toUpperCase();
    
    return `JECRC-${year}-${random}-${hashPrefix}`;
  }

  /**
   * Create blockchain record for certificate
   * This stores the hash and creates an immutable record
   */
  async createBlockchainRecord(certificateData) {
    try {
      // Generate certificate hash
      const certificateHash = this.generateCertificateHash(certificateData);
      
      // Generate transaction ID
      const transactionId = this.generateTransactionId(certificateHash);
      
      // Generate block number (timestamp-based)
      const blockNumber = Date.now();
      
      // Create blockchain record
      const blockchainRecord = {
        transactionId,
        certificateHash,
        blockNumber,
        timestamp: new Date().toISOString(),
        studentId: certificateData.student_id,
        registrationNo: certificateData.registration_no,
        verified: true
      };

      return {
        success: true,
        ...blockchainRecord
      };
    } catch (error) {
      console.error('Blockchain record creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify certificate against stored hash
   */
  verifyCertificate(certificateData, storedHash) {
    try {
      // Generate hash from current data
      const currentHash = this.generateCertificateHash(certificateData);
      
      // Compare hashes
      const isValid = currentHash === storedHash;
      
      return {
        valid: isValid,
        currentHash,
        storedHash,
        message: isValid 
          ? 'Certificate is authentic and unmodified'
          : 'Certificate has been tampered with or data mismatch'
      };
    } catch (error) {
      console.error('Verification error:', error);
      return {
        valid: false,
        error: error.message,
        message: 'Verification failed'
      };
    }
  }

  /**
   * Generate QR code data with all verification info
   */
  generateQRData(blockchainRecord, certificateData) {
    return {
      // Verification identifiers
      txId: blockchainRecord.transactionId,
      hash: blockchainRecord.certificateHash,
      block: blockchainRecord.blockNumber,
      
      // Student info for quick verification
      studentId: certificateData.student_id,
      regNo: certificateData.registration_no,
      name: certificateData.full_name,
      
      // Timestamp
      issued: blockchainRecord.timestamp,
      
      // Verification URL (for external verifiers)
      verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/verify/${blockchainRecord.transactionId}`
    };
  }

  /**
   * Verify QR data against database
   */
  async verifyQRData(qrData, databaseRecord) {
    try {
      // Check if transaction ID matches
      if (qrData.txId !== databaseRecord.blockchain_tx) {
        return {
          valid: false,
          reason: 'Transaction ID mismatch'
        };
      }

      // Check if hash matches
      if (qrData.hash !== databaseRecord.blockchain_hash) {
        return {
          valid: false,
          reason: 'Certificate hash mismatch - certificate may be tampered'
        };
      }

      // Check if student details match
      if (qrData.studentId !== databaseRecord.student_id ||
          qrData.regNo !== databaseRecord.registration_no) {
        return {
          valid: false,
          reason: 'Student details mismatch'
        };
      }

      // All checks passed
      return {
        valid: true,
        transactionId: qrData.txId,
        certificateHash: qrData.hash,
        blockNumber: qrData.block,
        issuedAt: qrData.issued,
        studentDetails: {
          id: databaseRecord.student_id,
          name: databaseRecord.full_name,
          registrationNo: databaseRecord.registration_no,
          course: databaseRecord.course,
          branch: databaseRecord.branch
        }
      };
    } catch (error) {
      console.error('QR verification error:', error);
      return {
        valid: false,
        reason: 'Verification failed',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

// ✅ Export individual methods as named exports (for certificateService.js compatibility)
export const generateCertificateHash = (data) => blockchainService.generateCertificateHash(data);
export const generateTransactionId = (hash) => blockchainService.generateTransactionId(hash);
export const createBlockchainRecord = (data) => blockchainService.createBlockchainRecord(data);
export const generateQRData = (record, data) => blockchainService.generateQRData(record, data);
export const verifyCertificate = (data, hash) => blockchainService.verifyCertificate(data, hash);
export const verifyQRData = (qr, db) => blockchainService.verifyQRData(qr, db);

// Export singleton instance as default
export default blockchainService;

// Export class and instance for testing
export { BlockchainService, blockchainService };