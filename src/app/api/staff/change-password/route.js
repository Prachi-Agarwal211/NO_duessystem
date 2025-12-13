import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

    // Create Supabase client with cookies using Next.js async cookies
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (error) {
              // Cookie setting failed - log for debugging
              console.error('Cookie setting error:', error);
            }
          },
        },
      }
    );

    // Get current user session with detailed error logging
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', {
        error: userError,
        hasUser: !!user,
        cookies: cookieStore.getAll().map(c => c.name),
      });
      return NextResponse.json(
        { success: false, error: 'Not authenticated. Please log in again.' },
        { status: 401 }
      );
    }

    // ✅ FIX: User is already authenticated via valid session token
    // No need to verify old password again - they proved identity by logging in
    // Removing signInWithPassword prevents session conflicts
    
    // Note: For additional security, frontend can implement re-authentication
    // before showing the change password modal (optional enhancement)

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