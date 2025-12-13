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
 * POST /api/staff/verify-otp
 * 
 * Verify OTP code for password reset.
 * Returns a temporary token if valid.
 */
export async function POST(request) {
  try {
    const { email, otp } = await request.json();

    // Validation
    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!otp || !otp.trim()) {
      return NextResponse.json(
        { success: false, error: 'OTP is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOTP = otp.trim();

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(normalizedOTP)) {
      return NextResponse.json(
        { success: false, error: 'OTP must be 6 digits' },
        { status: 400 }
      );
    }

    // Get user profile with OTP data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, otp_code, otp_expires_at, otp_attempts')
      .eq('email', normalizedEmail)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or OTP' },
        { status: 400 }
      );
    }

    // Check if OTP exists
    if (!profile.otp_code) {
      return NextResponse.json(
        { success: false, error: 'No OTP found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if OTP has expired
    const expiresAt = new Date(profile.otp_expires_at);
    const now = new Date();
    
    if (now > expiresAt) {
      // Clear expired OTP
      await supabaseAdmin
        .from('profiles')
        .update({
          otp_code: null,
          otp_expires_at: null,
          otp_attempts: 0
        })
        .eq('id', profile.id);

      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check attempt limit
    if (profile.otp_attempts >= 5) {
      // Clear OTP after too many attempts
      await supabaseAdmin
        .from('profiles')
        .update({
          otp_code: null,
          otp_expires_at: null,
          otp_attempts: 0
        })
        .eq('id', profile.id);

      return NextResponse.json(
        { success: false, error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Verify OTP code
    if (profile.otp_code !== normalizedOTP) {
      // Increment failed attempts
      await supabaseAdmin
        .from('profiles')
        .update({
          otp_attempts: profile.otp_attempts + 1
        })
        .eq('id', profile.id);

      const remainingAttempts = 5 - (profile.otp_attempts + 1);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.` 
        },
        { status: 400 }
      );
    }

    // OTP is valid - generate temporary reset token
    // This token will be used for the reset-password endpoint
    const resetToken = `${profile.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // ✅ EXTENDED: 30 minutes (was 15)

    // Store reset token (we'll use otp_code field temporarily)
    await supabaseAdmin
      .from('profiles')
      .update({
        otp_code: resetToken,
        otp_expires_at: resetTokenExpiry.toISOString(),
        otp_attempts: 0
      })
      .eq('id', profile.id);

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken: resetToken,
      expiresIn: 15 * 60 // seconds
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}