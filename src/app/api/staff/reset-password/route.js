import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client
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
 * Validate password strength
 */
function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * POST /api/staff/reset-password
 * 
 * Reset password using verified OTP token.
 * Requires resetToken from verify-otp endpoint.
 */
export async function POST(request) {
  try {
    const { email, resetToken, newPassword, confirmPassword } = await request.json();

    // Validation
    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!resetToken || !resetToken.trim()) {
      return NextResponse.json(
        { success: false, error: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!newPassword || !newPassword.trim()) {
      return NextResponse.json(
        { success: false, error: 'New password is required' },
        { status: 400 }
      );
    }

    if (!confirmPassword || !confirmPassword.trim()) {
      return NextResponse.json(
        { success: false, error: 'Password confirmation is required' },
        { status: 400 }
      );
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password does not meet requirements',
          details: passwordValidation.errors
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ✅ NEW: Get user profile with dedicated reset_token field
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, reset_token, reset_token_expires_at')
      .eq('email', normalizedEmail)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json(
        { success: false, error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Verify reset token exists
    if (!profile.reset_token) {
      return NextResponse.json(
        { success: false, error: 'Reset token not found. Please restart the password reset process.' },
        { status: 400 }
      );
    }

    // Check if reset token has expired
    const expiresAt = new Date(profile.reset_token_expires_at);
    const now = new Date();

    console.log(`🔍 Token validation for ${profile.email}:`, {
      tokenFromURL: resetToken.substring(0, 20) + '...',
      tokenInDB: profile.reset_token.substring(0, 20) + '...',
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString(),
      isExpired: now > expiresAt,
      tokensMatch: profile.reset_token === resetToken
    });

    if (now > expiresAt) {
      // Clear expired token
      await supabaseAdmin
        .from('profiles')
        .update({
          reset_token: null,
          reset_token_expires_at: null
        })
        .eq('id', profile.id);

      return NextResponse.json(
        { success: false, error: 'Reset token has expired. Please restart the password reset process.' },
        { status: 400 }
      );
    }

    // ✅ NEW: Verify reset token matches using dedicated field
    if (profile.reset_token !== resetToken) {
      console.error('❌ Token mismatch!', {
        expected: profile.reset_token,
        received: resetToken
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid reset token. Please restart the password reset process.',
          code: 'TOKEN_INVALID'
        },
        { status: 400 }
      );
    }

    console.log('✅ Reset token validated successfully');

    // Get user's auth record
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { success: false, error: 'Failed to update password' },
        { status: 500 }
      );
    }

    const user = users.find(u => u.email === normalizedEmail);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update password using Supabase Admin API
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

    // ✅ NEW: Clear reset token from dedicated field and update last_password_change
    const { error: clearError } = await supabaseAdmin
      .from('profiles')
      .update({
        reset_token: null,
        reset_token_expires_at: null,
        last_password_change: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (clearError) {
      console.error('Error clearing reset token:', clearError);
      // Don't fail the request since password was updated successfully
    }

    console.log(`✅ Password reset successful for ${profile.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}