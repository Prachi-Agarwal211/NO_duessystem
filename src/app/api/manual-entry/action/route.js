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

    // Get the manual entry from no_dues_forms table
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*')
      .eq('id', entry_id)
      .eq('is_manual_entry', true)
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
      // Update form status to completed (admin approved)
      const { error: updateError } = await supabaseAdmin
        .from('no_dues_forms')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', entry_id);

      if (updateError) {
        console.error('Error approving manual entry:', updateError);
        return NextResponse.json(
          { error: 'Failed to approve manual entry', details: updateError.message },
          { status: 500 }
        );
      }

      // Update department status to approved
      const { error: statusError } = await supabaseAdmin
        .from('no_dues_status')
        .update({
          status: 'approved',
          action_by_user_id: decoded.userId,
          action_at: new Date().toISOString()
        })
        .eq('form_id', entry_id)
        .eq('department_name', 'Department');

      if (statusError) {
        console.error('Error updating department status:', statusError);
      }

      return NextResponse.json({
        success: true,
        message: 'Manual entry approved successfully',
        data: {
          form_id: entry_id,
          status: 'completed'
        }
      });

    } else if (action === 'reject') {
      // Update form status to rejected
      const { error: updateError } = await supabaseAdmin
        .from('no_dues_forms')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', entry_id);

      if (updateError) {
        console.error('Error rejecting manual entry:', updateError);
        return NextResponse.json(
          { error: 'Failed to reject manual entry', details: updateError.message },
          { status: 500 }
        );
      }

      // Update department status to rejected
      const { error: statusError } = await supabaseAdmin
        .from('no_dues_status')
        .update({
          status: 'rejected',
          rejection_reason,
          action_by_user_id: decoded.userId,
          action_at: new Date().toISOString()
        })
        .eq('form_id', entry_id)
        .eq('department_name', 'Department');

      if (statusError) {
        console.error('Error updating department status:', statusError);
      }

      return NextResponse.json({
        success: true,
        message: 'Manual entry rejected',
        data: {
          form_id: entry_id,
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