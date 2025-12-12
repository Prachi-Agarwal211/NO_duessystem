/**
 * Email Queue Status Monitor
 * Provides statistics and health check for email queue system
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    // Get queue statistics
    const { data: stats, error: statsError } = await supabase
      .from('email_queue')
      .select('status, attempts')
      .then(({ data, error }) => {
        if (error) return { data: null, error };
        
        // Calculate statistics
        const statusCounts = data.reduce((acc, email) => {
          acc[email.status] = (acc[email.status] || 0) + 1;
          return acc;
        }, {});

        const avgAttempts = data.length > 0
          ? (data.reduce((sum, email) => sum + email.attempts, 0) / data.length).toFixed(2)
          : 0;

        return {
          data: {
            total: data.length,
            statusCounts,
            avgAttempts: parseFloat(avgAttempts)
          },
          error: null
        };
      });

    if (statsError) throw statsError;

    // Get oldest pending email
    const { data: oldestPending, error: oldestError } = await supabase
      .from('email_queue')
      .select('created_at, scheduled_for')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    // Get recent completed/failed emails
    const { data: recentActivity, error: activityError } = await supabase
      .from('email_queue')
      .select('status, completed_at, error_message')
      .in('status', ['completed', 'failed'])
      .order('updated_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      queue: stats,
      oldestPending: oldestPending ? {
        age: Math.floor((Date.now() - new Date(oldestPending.created_at)) / 1000 / 60), // minutes
        scheduledFor: oldestPending.scheduled_for
      } : null,
      recentActivity: recentActivity || [],
      smtp: {
        configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
        host: process.env.SMTP_HOST || 'not configured',
        from: process.env.SMTP_FROM || 'not configured'
      }
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}