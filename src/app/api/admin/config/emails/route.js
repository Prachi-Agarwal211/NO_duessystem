export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateAndVerify } from '@/lib/authHelpers';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AdminConfigEmailsAPI');

// GET - Fetch all email configurations
export async function GET(request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    let query = supabaseAdmin
      .from('config_emails')
      .select('*')
      .order('key');

    if (key) {
      query = query.eq('key', key);
    }

    const { data, error } = await query;

    if (error) throw error;

    // If single key requested, return single object
    if (key && data && data.length > 0) {
      return NextResponse.json({ success: true, data: data[0] });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('GET email config error', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update email configuration (Admin only)
export async function PUT(request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const adminCheck = await authenticateAndVerify(request, 'admin');
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.statusCode }
      );
    }

    const body = await request.json();

    if (!body.key) {
      return NextResponse.json(
        { success: false, error: 'Configuration key is required' },
        { status: 400 }
      );
    }

    if (body.value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Configuration value is required' },
        { status: 400 }
      );
    }

    // Validate specific keys
    if (body.key === 'college_domain') {
      // Basic domain validation
      const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
      if (!domainRegex.test(body.value)) {
        return NextResponse.json(
          { success: false, error: 'Invalid domain format' },
          { status: 400 }
        );
      }
    }

    if (['admin_email', 'system_email'].includes(body.key)) {
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.value)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    if (body.key === 'notifications_enabled') {
      // Boolean validation
      if (!['true', 'false'].includes(body.value.toLowerCase())) {
        return NextResponse.json(
          { success: false, error: 'Value must be "true" or "false"' },
          { status: 400 }
        );
      }
    }

    const updates = {
      value: body.value,
      updated_by: adminCheck.userId,
      updated_at: new Date().toISOString()
    };

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    // Upsert (update if exists, insert if not)
    const { data, error } = await supabaseAdmin
      .from('config_emails')
      .upsert(
        {
          key: body.key,
          ...updates
        },
        {
          onConflict: 'key',
          returning: 'representation'
        }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('PUT email config error', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Not needed, use PUT for upsert
export async function POST(request) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Use PUT method for creating/updating email configurations' 
    },
    { status: 405 }
  );
}

// DELETE - Remove email configuration (Admin only)
export async function DELETE(request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const adminCheck = await authenticateAndVerify(request, 'admin');
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.statusCode }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Configuration key is required' },
        { status: 400 }
      );
    }

    // Prevent deletion of critical configs
    const criticalKeys = ['college_domain', 'admin_email', 'system_email', 'notifications_enabled'];
    if (criticalKeys.includes(key)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete critical configuration "${key}". You can update it instead.` 
        },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('config_emails')
      .delete()
      .eq('key', key);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Email configuration deleted successfully' 
    });
  } catch (error) {
    logger.error('DELETE email config error', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}