import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create Supabase client with service role for bypassing RLS on insert
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, rollNumber, message, requesterType, subject } = body;

    // Validation
    if (!email || !message || !requesterType) {
      return NextResponse.json(
        { success: false, error: 'Email, message, and requester type are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate requester type
    if (!['student', 'department'].includes(requesterType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid requester type' },
        { status: 400 }
      );
    }

    // Validate roll number based on requester type
    if (requesterType === 'student') {
      if (!rollNumber) {
        return NextResponse.json(
          { success: false, error: 'Roll number is required for students' },
          { status: 400 }
        );
      }
    }

    // If department/admin, roll number should be null
    const finalRollNumber = requesterType === 'department' ? null : rollNumber;

    // Message length validation
    if (message.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Message must be at least 10 characters long' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Message must not exceed 5000 characters' },
        { status: 400 }
      );
    }

    // Extract priority from subject if present (for admin requests)
    let priority = 'normal';
    let cleanSubject = subject?.trim() || 'Support Request';
    
    // Check if subject contains priority tag from admin modal
    if (cleanSubject.includes('[Priority:')) {
      const priorityMatch = cleanSubject.match(/\[Priority:\s*(NORMAL|HIGH|URGENT)\]/i);
      if (priorityMatch) {
        priority = priorityMatch[1].toLowerCase();
      }
    }

    // Insert support ticket
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .insert([
        {
          email: email.toLowerCase().trim(),
          roll_number: finalRollNumber?.toUpperCase().trim(),
          requester_type: requesterType,
          subject: cleanSubject,
          message: message.trim(),
          status: 'open',
          priority: priority
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

    // Log successful submission
    console.log('✅ Support ticket created:', {
      ticketNumber: data.ticket_number,
      email: data.email,
      requesterType: data.requester_type
    });

    return NextResponse.json({
      success: true,
      message: 'Support request submitted successfully',
      ticket: {
        ticketNumber: data.ticket_number,
        email: data.email,
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