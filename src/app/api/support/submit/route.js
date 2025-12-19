import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Force dynamic rendering (prevents static generation)
export const dynamic = 'force-dynamic';

// Create Supabase client with service role for bypassing RLS on insert
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, message, requesterType } = body;

    // Simple validation
    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!message || !message.trim() || message.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Message must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (!requesterType || !['student', 'department'].includes(requesterType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid requester type' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate ticket number
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const ticketNumber = `TKT-${timestamp}${random}`;

    // Insert support ticket - SIMPLIFIED
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .insert([
        {
          user_email: email.toLowerCase().trim(),
          user_name: email.split('@')[0].replace(/[._-]/g, ' ').trim(),
          user_type: requesterType,
          requester_type: requesterType,
          subject: 'Support Request', // Simple default
          message: message.trim(),
          category: 'other', // Default category
          status: 'open',
          priority: 'medium', // Default priority
          ticket_number: ticketNumber
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating support ticket:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to submit support request. Please try again.' },
        { status: 500 }
      );
    }

    console.log('✅ Support ticket created:', {
      ticketNumber: data.ticket_number,
      email: data.user_email,
      requesterType: data.requester_type
    });

    return NextResponse.json({
      success: true,
      message: 'Support request submitted successfully',
      ticket: {
        ticketNumber: data.ticket_number,
        email: data.user_email,
        requesterType: data.requester_type,
        status: data.status,
        createdAt: data.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in support submission:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}