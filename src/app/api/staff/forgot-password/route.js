import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

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

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Generate 6-digit OTP code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/staff/forgot-password
 * 
 * Generate and send OTP for password reset.
 * Only works for staff members (department/admin roles).
 */
export async function POST(request) {
  try {
    const { email } = await request.json();

    // Validation
    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists and has staff role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', normalizedEmail)
      .single();

    if (profileError || !profile) {
      // Don't reveal if email exists for security
      return NextResponse.json({
        success: true,
        message: 'If this email is registered, you will receive an OTP code shortly'
      });
    }

    // Verify user has staff role
    if (profile.role !== 'department' && profile.role !== 'admin') {
      return NextResponse.json({
        success: true,
        message: 'If this email is registered, you will receive an OTP code shortly'
      });
    }

    // Generate 6-digit OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        otp_code: otpCode,
        otp_expires_at: expiresAt.toISOString(),
        otp_attempts: 0
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('OTP storage error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    // Send OTP via email
    try {
      await transporter.sendMail({
        from: `"JECRC No Dues System" <${process.env.SMTP_USER}>`,
        to: profile.email,
        subject: 'Password Reset OTP - JECRC No Dues System',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset OTP</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${profile.full_name}</strong>,</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                You have requested to reset your password for the JECRC No Dues System.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Your OTP Code:</p>
                <div style="font-size: 36px; font-weight: bold; color: #DC2626; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otpCode}
                </div>
                <p style="font-size: 12px; color: #999; margin-top: 10px;">This code expires in 10 minutes</p>
              </div>
              
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>⚠️ Security Notice:</strong><br>
                  If you did not request this password reset, please ignore this email and contact your system administrator immediately.
                </p>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Best regards,<br>
                <strong>JECRC University</strong><br>
                No Dues System
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="font-size: 12px; color: #999;">
                This is an automated message. Please do not reply to this email.<br>
                © ${new Date().getFullYear()} JECRC University. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `
Password Reset OTP - JECRC No Dues System

Hello ${profile.full_name},

You have requested to reset your password for the JECRC No Dues System.

Your OTP Code: ${otpCode}

This code expires in 10 minutes.

⚠️ Security Notice:
If you did not request this password reset, please ignore this email and contact your system administrator immediately.

Best regards,
JECRC University
No Dues System

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} JECRC University. All rights reserved.
        `
      });

      console.log('✅ OTP email sent successfully to:', profile.email);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Rollback OTP storage
      await supabaseAdmin
        .from('profiles')
        .update({
          otp_code: null,
          otp_expires_at: null,
          otp_attempts: 0
        })
        .eq('id', profile.id);

      return NextResponse.json(
        { success: false, error: 'Failed to send OTP email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP code sent to your email. Please check your inbox.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}