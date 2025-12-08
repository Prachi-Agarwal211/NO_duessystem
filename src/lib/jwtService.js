import { SignJWT, jwtVerify, importJWK } from 'jose';

// Centralized JWT token generation and validation service
// This resolves the duplication issue found across multiple files

/**
 * Creates a secure JWT token for department action links
 * @param {Object} payload - Data to include in the token
 * @param {string} payload.user_id - User ID
 * @param {string} payload.form_id - Form ID
 * @param {string} payload.department - Department name
 * @returns {Promise<string>} - JWT token
 */
export const createSecureToken = async (payload) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured in environment variables');
    }

    // Validate required payload fields
    if (!payload.user_id || !payload.form_id || !payload.department) {
        throw new Error('Missing required fields in JWT payload');
    }

    // SECURITY: Ensure secret is long enough (minimum 32 characters)
    if (secret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }

    const jwk = {
        kty: 'oct',
        k: Buffer.from(secret).toString('base64'),
    };

    const key = await importJWK(jwk, 'HS256');

    // Add jti (JWT ID) for token tracking and revocation capability
    const jti = `${payload.form_id}-${payload.department}-${Date.now()}`;

    return await new SignJWT({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d') // 30 days expiration
        .setIssuer('jecrc-no-dues-system') // Add issuer claim
        .setAudience('department-action') // Add audience claim
        .sign(key);
};

/**
 * Validates a JWT token and returns the decoded payload
 * @param {string} token - JWT token to validate
 * @returns {Promise<Object>} - Decoded payload
 * @throws {Error} - If token is invalid, expired, or malformed
 */
export const validateToken = async (token) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }

    // Basic token format validation
    if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
        throw new Error('Invalid token format');
    }

    const jwk = {
        kty: 'oct',
        k: Buffer.from(secret).toString('base64'),
    };

    const key = await importJWK(jwk, 'HS256');

    try {
        // FIXED: Use jwtVerify instead of incorrect implementation
        const { payload } = await jwtVerify(token, key, {
            issuer: 'jecrc-no-dues-system',
            audience: 'department-action',
            algorithms: ['HS256']
        });

        // Validate required fields are present
        if (!payload.user_id || !payload.form_id || !payload.department) {
            throw new Error('Token missing required fields');
        }

        // Additional security: Check if token is not too old (even if not expired)
        const tokenAge = Date.now() / 1000 - payload.iat;
        const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
        if (tokenAge > maxAge) {
            throw new Error('Token is too old');
        }

        return payload;
    } catch (error) {
        // Provide specific error messages for debugging
        if (error.code === 'ERR_JWT_EXPIRED') {
            throw new Error('Token has expired');
        } else if (error.code === 'ERR_JWT_INVALID') {
            throw new Error('Invalid token signature');
        } else if (error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
            throw new Error('Token claim validation failed');
        } else if (error.message.includes('Token')) {
            throw error; // Re-throw our custom errors
        } else {
            throw new Error('Invalid or expired token');
        }
    }
};

/**
 * Creates action URL for department staff
 * @param {Object} params - Parameters for token generation
 * @param {string} params.user_id - User ID
 * @param {string} params.form_id - Form ID
 * @param {string} params.department - Department name
 * @param {string} baseUrl - Base URL for the application
 * @returns {Promise<URL>} - Action URL with token
 */
export const createActionUrl = async ({ user_id, form_id, department }, baseUrl = null) => {
    // Validate input parameters
    if (!user_id || !form_id || !department) {
        throw new Error('Missing required parameters for action URL creation');
    }

    const token = await createSecureToken({ user_id, form_id, department });
    
    // Use environment variable or fallback
    const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Validate base URL format
    try {
        const url = new URL('/department/action', base);
        url.searchParams.set('token', token);
        return url;
    } catch (error) {
        throw new Error('Invalid base URL provided');
    }
};

/**
 * Decode token without verification (for debugging only)
 * WARNING: Never use this for authentication/authorization
 * @param {string} token - JWT token to decode
 * @returns {Object} - Decoded payload (unverified)
 */
export const decodeTokenUnsafe = (token) => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload;
    } catch (error) {
        throw new Error('Failed to decode token');
    }
};