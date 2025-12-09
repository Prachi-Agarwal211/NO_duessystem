import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyToken } from '@/lib/jwtService';

/**
 * POST /api/manual-entry/action
 * Approve or reject a manual entry (Admin only)
 */
export async function POST(request) {
  try {
    // Verify admin authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { entry_id, action, rejection_reason } = body;

    // Validate input
    if (!entry_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: entry_id and action' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !rejection_reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting' },
        { status: 400 }
      );
    }

    // Get the manual entry
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('manual_entries')
      .select('*')
      .eq('id', entry_id)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json(
        { error: 'Manual entry not found' },
        { status: 404 }
      );
    }

    if (entry.status !== 'pending') {
      return NextResponse.json(
        { error: `Manual entry already ${entry.status}` },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Update manual entry to approved
      const { error: updateError } = await supabaseAdmin
        .from('manual_entries')
        .update({
          status: 'approved',
          approved_by: decoded.userId,
          approved_at: new Date().toISOString()
        })
        .eq('id', entry_id);

      if (updateError) {
        console.error('Error updating manual entry:', updateError);
        return NextResponse.json(
          { error: 'Failed to approve manual entry', details: updateError.message },
          { status: 500 }
        );
      }

      // Convert to completed form using the database function
      const { data: formData, error: convertError } = await supabaseAdmin
        .rpc('convert_manual_entry_to_form', { manual_entry_id: entry_id });

      if (convertError) {
        console.error('Error converting manual entry to form:', convertError);
        return NextResponse.json(
          { error: 'Manual entry approved but failed to create form', details: convertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Manual entry approved and converted to completed form',
        data: {
          manual_entry_id: entry_id,
          form_id: formData
        }
      });

    } else if (action === 'reject') {
      // Update manual entry to rejected
      const { error: updateError } = await supabaseAdmin
        .from('manual_entries')
        .update({
          status: 'rejected',
          rejection_reason,
          approved_by: decoded.userId,
          approved_at: new Date().toISOString()
        })
        .eq('id', entry_id);

      if (updateError) {
        console.error('Error rejecting manual entry:', updateError);
        return NextResponse.json(
          { error: 'Failed to reject manual entry', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Manual entry rejected',
        data: {
          manual_entry_id: entry_id,
          rejection_reason
        }
      });
    }

  } catch (error) {
    console.error('Error in manual entry action:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}