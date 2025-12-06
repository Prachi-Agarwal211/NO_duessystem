import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabaseAdmin';

/**
 * Authenticate request using Authorization header
 * @param {Request} request - Next.js request object
 * @returns {Promise<{user?: Object, error?: string, status?: number}>}
 */
export async function authenticateRequest(request) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return { error: 'Missing Authorization header', status: 401 };
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }
  
  return { user };
}

/**
 * Verify user has required role(s)
 * @param {string} userId - User ID to verify
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 * @returns {Promise<{profile?: Object, error?: string, status?: number}>}
 */
export async function verifyRole(userId, allowedRoles) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role, department_name, full_name, school_id, school_ids, course_ids, branch_ids')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { error: 'Profile not found', status: 404 };
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  if (!roles.includes(profile.role)) {
    return { error: 'Unauthorized', status: 401 };
  }

  return { profile };
}

/**
 * Combined authentication and role verification
 * @param {Request} request - Next.js request object
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 * @returns {Promise<{user?: Object, profile?: Object, error?: string, status?: number}>}
 */
export async function authenticateAndVerify(request, allowedRoles) {
  const authResult = await authenticateRequest(request);
  if (authResult.error) {
    return authResult;
  }

  const roleResult = await verifyRole(authResult.user.id, allowedRoles);
  if (roleResult.error) {
    return roleResult;
  }

  return {
    user: authResult.user,
    profile: roleResult.profile
  };
}

/**
 * Create unauthorized response
 * @param {string} message - Error message
 * @returns {NextResponse}
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Create not found response
 * @param {string} message - Error message
 * @returns {NextResponse}
 */
export function notFoundResponse(message = 'Resource not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Create bad request response
 * @param {string} message - Error message
 * @returns {NextResponse}
 */
export function badRequestResponse(message = 'Bad request') {
  return NextResponse.json({ error: message }, { status: 400 });
}