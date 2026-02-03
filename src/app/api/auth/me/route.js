import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Get user profile - query by EMAIL first (handles ID mismatches)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, department_name, registration_no')
      .eq('email', userEmail.toLowerCase())
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Fallback to ID lookup
      const { data: profileById, error: profileByIdError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, department_name, registration_no')
        .eq('id', userId)
        .single();

      if (profileByIdError) {
        console.error('Profile fetch error:', profileByIdError);
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      return NextResponse.json({
        user: {
          id: userId,
          email: session.user.email,
          ...profileById
        }
      });
    }

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: userId,
        email: session.user.email,
        ...profileData
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
