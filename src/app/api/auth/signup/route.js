import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request) {
  try {
    const { email, password, fullName, registrationNo, role } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Email, password, and fullName are required' }, { status: 400 });
    }

    // For student registration, registrationNo is required
    if (role === 'student' && !registrationNo) {
      return NextResponse.json({ error: 'Registration number is required for students' }, { status: 400 });
    }

    // Note: We don't need to check if user exists beforehand
    // The signUp method will handle duplicate emails appropriately

    // Sign up user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        }
      }
    });

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    if (!signUpData.user) {
      return NextResponse.json({ error: 'Sign up failed' }, { status: 400 });
    }

    const userId = signUpData.user.id;

    // Insert profile data
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          full_name: fullName,
          role: role || 'student',
          registration_no: role === 'student' ? registrationNo : null,
          email: email
        }
      ]);

    if (profileError) {
      // Rollback: Delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'User registered successfully', 
      user: signUpData.user 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}