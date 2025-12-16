/**
 * jwtService.js
 * JWT token generation and verification for password reset and other auth flows
 * Uses the 'jose' library for secure JWT operations
 */

import { SignJWT, jwtVerify } from 'jose';

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';

// Convert string secret to Uint8Array for jose
const getSecretKey = () => {
  return new TextEncoder().encode(JWT_SECRET);
};

/**
 * Generate a JWT token
 * @param {Object} payload - Data to encode in token
 * @param {string} expiresIn - Expiration time (e.g., '1h', '24h', '7d')
 * @returns {Promise<string>} JWT token
 */
export async function generateToken(payload, expiresIn = '1h') {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(getSecretKey());

    return token;
  } catch (error) {
    console.error('[jwtService] Token generation error:', error);
    throw new Error('Failed to generate token');
  }
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Token has expired');
    }
    if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      throw new Error('Invalid token signature');
    }
    console.error('[jwtService] Token verification error:', error);
    throw new Error('Invalid token');
  }
}

/**
 * Generate a password reset token
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {Promise<string>} Password reset token
 */
export async function generatePasswordResetToken(userId, email) {
  return generateToken(
    {
      userId,
      email,
      type: 'password-reset'
    },
    '1h' // Token expires in 1 hour
  );
}

/**
 * Verify a password reset token
 * @param {string} token - Password reset token
 * @returns {Promise<Object>} Token payload with userId and email
 * @throws {Error} If token is invalid or not a password-reset token
 */
export async function verifyPasswordResetToken(token) {
  const payload = await verifyToken(token);
  
  if (payload.type !== 'password-reset') {
    throw new Error('Invalid token type');
  }
  
  return {
    userId: payload.userId,
    email: payload.email
  };
}

/**
 * Generate a manual entry action token (for approval/rejection)
 * @param {string} requestId - Manual entry request ID
 * @param {string} adminId - Admin user ID
 * @param {string} action - Action type ('approve' or 'reject')
 * @returns {Promise<string>} Action token
 */
export async function generateManualEntryActionToken(requestId, adminId, action) {
  return generateToken(
    {
      requestId,
      adminId,
      action,
      type: 'manual-entry-action'
    },
    '24h' // Token expires in 24 hours
  );
}

/**
 * Verify a manual entry action token
 * @param {string} token - Action token
 * @returns {Promise<Object>} Token payload
 * @throws {Error} If token is invalid
 */
export async function verifyManualEntryActionToken(token) {
  const payload = await verifyToken(token);
  
  if (payload.type !== 'manual-entry-action') {
    throw new Error('Invalid token type');
  }
  
  return {
    requestId: payload.requestId,
    adminId: payload.adminId,
    action: payload.action
  };
}

/**
 * Generate a certificate verification token
 * @param {string} certificateId - Certificate ID
 * @returns {Promise<string>} Verification token
 */
export async function generateCertificateToken(certificateId) {
  return generateToken(
    {
      certificateId,
      type: 'certificate-verification'
    },
    '365d' // Long-lived token for certificates
  );
}

/**
 * Verify a certificate token
 * @param {string} token - Certificate token
 * @returns {Promise<Object>} Token payload
 * @throws {Error} If token is invalid
 */
export async function verifyCertificateToken(token) {
  const payload = await verifyToken(token);
  
  if (payload.type !== 'certificate-verification') {
    throw new Error('Invalid token type');
  }
  
  return {
    certificateId: payload.certificateId
  };
}

/**
 * Generate a generic auth token
 * @param {Object} user - User object
 * @param {string} expiresIn - Expiration time
 * @returns {Promise<string>} Auth token
 */
export async function generateAuthToken(user, expiresIn = '7d') {
  return generateToken(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'auth'
    },
    expiresIn
  );
}

/**
 * Verify an auth token
 * @param {string} token - Auth token
 * @returns {Promise<Object>} User data from token
 * @throws {Error} If token is invalid
 */
export async function verifyAuthToken(token) {
  const payload = await verifyToken(token);
  
  if (payload.type !== 'auth') {
    throw new Error('Invalid token type');
  }
  
  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role
  };
}

/**
 * Check if a token is expired without throwing an error
 * @param {string} token - JWT token
 * @returns {Promise<boolean>} True if expired
 */
export async function isTokenExpired(token) {
  try {
    await verifyToken(token);
    return false;
  } catch (error) {
    return error.message === 'Token has expired';
  }
}

/**
 * Decode a token without verifying (useful for debugging)
 * WARNING: Do not use for authentication - only for debugging
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
export function decodeTokenUnsafe(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString()
    );
    
    return payload;
  } catch {
    return null;
  }
}