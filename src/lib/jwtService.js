import { SignJWT, importJWK } from 'jose';

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

    const jwk = {
        kty: 'oct',
        k: Buffer.from(secret).toString('base64'),
    };

    const key = await importJWK(jwk, 'HS256');

    return await new SignJWT({
        ...payload,
        iat: Math.floor(Date.now() / 1000)
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(key);
};

/**
 * Validates a JWT token and returns the decoded payload
 * @param {string} token - JWT token to validate
 * @returns {Promise<Object>} - Decoded payload
 */
export const validateToken = async (token) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }

    const jwk = {
        kty: 'oct',
        k: Buffer.from(secret).toString('base64'),
    };

    const key = await importJWK(jwk, 'HS256');

    try {
        const { payload } = await importJWK(jwk, 'HS256').then(() =>
            new SignJWT(token).verify(key)
        );
        return payload;
    } catch (error) {
        throw new Error('Invalid or expired token');
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
    const token = await createSecureToken({ user_id, form_id, department });
    const url = new URL('/department/action', baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    url.searchParams.set('token', token);
    return url;
};