export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        });
      },
    },
  }
);

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const emailType = searchParams.get('email_type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit')) || 100;

    // Get email logs with filters
    let query = supabaseAdmin
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (emailType && emailType !== 'all') {
      query = query.eq('email_type', emailType);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) throw logsError;

    // Get statistics
    const { data: stats } = await supabaseAdmin
      .from('email_logs')
      .select('status, email_type')
      .then(({ data, error }) => {
        if (error) return { data: null };
        
        const totalEmails = data?.length || 0;
        const sentCount = data?.filter(e => e.status === 'sent').length || 0;
        const failedCount = data?.filter(e => e.status === 'failed').length || 0;
        const pendingCount = data?.filter(e => e.status === 'pending').length || 0;
        
        const typeBreakdown = {};
        data?.forEach(email => {
          if (!typeBreakdown[email.email_type]) {
            typeBreakdown[email.email_type] = { sent: 0, failed: 0, pending: 0, total: 0 };
          }
          typeBreakdown[email.email_type][email.status]++;
          typeBreakdown[email.email_type].total++;
        });

        return {
          data: {
            totalEmails,
            sentCount,
            failedCount,
            pendingCount,
            successRate: totalEmails > 0 ? ((sentCount / totalEmails) * 100).toFixed(1) : 0,
            typeBreakdown
          }
        };
      });

    return NextResponse.json({
      success: true,
      logs: logs || [],
      stats: stats || {
        totalEmails: 0,
        sentCount: 0,
        failedCount: 0,
        pendingCount: 0,
        successRate: 0,
        typeBreakdown: {}
      }
    });

  } catch (error) {
    console.error('Email Logs API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Retry failed email
export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { emailLogId } = await request.json();

    if (!emailLogId) {
      return NextResponse.json({ error: 'Email log ID required' }, { status: 400 });
    }

    // Get email log
    const { data: emailLog, error: fetchError } = await supabaseAdmin
      .from('email_logs')
      .select('*')
      .eq('id', emailLogId)
      .single();

    if (fetchError || !emailLog) {
      return NextResponse.json({ error: 'Email log not found' }, { status: 404 });
    }

    // Import email service
    const { sendEmail } = await import('@/lib/emailService');

    // Retry sending email
    try {
      await sendEmail(
        emailLog.recipient_email,
        emailLog.subject,
        emailLog.email_content
      );

      // Update log status
      await supabaseAdmin
        .from('email_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          retry_count: emailLog.retry_count + 1,
          error_message: null
        })
        .eq('id', emailLogId);

      return NextResponse.json({
        success: true,
        message: 'Email resent successfully'
      });

    } catch (emailError) {
      // Update log with new error
      await supabaseAdmin
        .from('email_logs')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          retry_count: emailLog.retry_count + 1,
          error_message: emailError.message
        })
        .eq('id', emailLogId);

      return NextResponse.json({
        success: false,
        error: 'Failed to resend email: ' + emailError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Email Retry API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}