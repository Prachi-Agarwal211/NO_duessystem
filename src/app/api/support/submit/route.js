import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supportTicketSchema, validateWithZod } from '@/lib/zodSchemas';

// Create Supabase client with service role for bypassing RLS on insert
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();

    // ==================== ZOD VALIDATION ====================
    // Validates email, message length, requester type, and roll number rules
    const validation = validateWithZod(body, supportTicketSchema);
    
    if (!validation.success) {
      const errorFields = Object.keys(validation.errors);
      const firstError = validation.errors[errorFields[0]];
      
      return NextResponse.json(
        { success: false, error: firstError || 'Validation failed' },
        { status: 400 }
      );
    }

    // All data is validated and sanitized by Zod
    const { email, rollNumber, message, requesterType, subject } = validation.data;
    
    // Roll number is already handled by Zod (null for department, required for student)
    const finalRollNumber = rollNumber;

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

    // Insert support ticket with correct column names
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .insert([
        {
          user_email: email.toLowerCase().trim(),
          user_name: email.split('@')[0].replace(/[._-]/g, ' ').trim(),
          user_type: requesterType,
          roll_number: finalRollNumber?.toUpperCase().trim() || null,
          requester_type: requesterType,
          subject: cleanSubject,
          message: message.trim(),
          category: determineCategory(cleanSubject),
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

// Helper function to determine category from subject
function determineCategory(subject) {
  const lower = subject.toLowerCase();
  if (lower.includes('login') || lower.includes('password') || lower.includes('access')) {
    return 'account';
  } else if (lower.includes('form') || lower.includes('submit') || lower.includes('reject')) {
    return 'form_issue';
  } else if (lower.includes('error') || lower.includes('bug') || lower.includes('not working')) {
    return 'technical';
  }
  return 'other';
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}