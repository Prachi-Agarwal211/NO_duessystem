import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client for password operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * POST /api/staff/change-password
 * 
 * Change password for authenticated staff member.
 * Requires: old password verification, new password, confirm password
 */
export async function POST(request) {
  try {
    const { oldPassword, newPassword, confirmPassword } = await request.json();

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New passwords do not match' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from old password' },
        { status: 400 }
      );
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password must contain uppercase, lowercase, and numbers' 
        },
        { status: 400 }
      );
    }

    // Get current user session from cookies
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated. Please log in again.' },
        { status: 401 }
      );
    }

    // Parse Supabase auth token from cookies
    // Supabase stores the session in cookies with the pattern: sb-<project-ref>-auth-token
    const authTokenMatch = cookieHeader.match(/sb-[a-z0-9]+-auth-token=([^;]+)/);
    
    if (!authTokenMatch) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated. Please log in again.' },
        { status: 401 }
      );
    }

    let user;
    try {
      // Decode the auth token (it's a JSON object with access_token)
      const authData = JSON.parse(decodeURIComponent(authTokenMatch[1]));
      const accessToken = authData.access_token || authData;
      
      // Verify the token and get user
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(
        typeof accessToken === 'string' ? accessToken : accessToken.access_token
      );

      if (authError || !authUser) {
        return NextResponse.json(
          { success: false, error: 'Invalid authentication. Please log in again.' },
          { status: 401 }
        );
      }

      user = authUser;
    } catch (parseError) {
      console.error('Token parsing error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid session format. Please log in again.' },
        { status: 401 }
      );
    }

    // Verify old password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword
    });

    if (signInError) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Update password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Update last_password_change in profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ last_password_change: new Date().toISOString() })
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Non-fatal error, password was changed successfully
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}