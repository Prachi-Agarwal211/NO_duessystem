import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyToken } from '@/lib/jwtService';

/**
 * POST /api/manual-entry/action
 * Approve or reject a manual entry (Admin only)
 */
export async function POST(request) {
  try {
    // Verify admin authentication using Supabase (same as other admin APIs)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
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
          action_by_user_id: user.id,
          action_at: new Date().toISOString()
        })
        .eq('form_id', entry_id)
        .eq('department_name', 'Department');

      if (statusError) {
        console.error('Error updating department status:', statusError);
      }

      // ===== SEND APPROVAL EMAIL TO STUDENT =====
      try {
        await sendEmail({
          to: entry.personal_email,
          subject: `✅ Manual Entry Approved - ${entry.registration_no}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
              <img src="https://jecrc.ac.in/wp-content/uploads/2023/06/logo-1.png" alt="JECRC" style="height: 60px; margin-bottom: 15px;"/>
              <h1 style="margin: 0; color: white; font-size: 24px;">JECRC University</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">No Dues Clearance System</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">✅ Manual Entry Approved!</h2>
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Dear Student,
              </p>
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Congratulations! Your offline no-dues certificate has been <strong>approved</strong> by the admin.
              </p>
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0; color: #16a34a; font-size: 18px; font-weight: 600;">✅ Approved</p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>Registration No:</strong> <span style="font-family: monospace; background: white; padding: 2px 6px; border-radius: 4px;">${entry.registration_no}</span></p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>School:</strong> ${entry.school}</p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>Course:</strong> ${entry.course}</p>
                <p style="margin: 0; color: #1f2937; font-size: 15px;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: 600;">COMPLETED</span></p>
              </div>
              <p style="margin: 20px 0; color: #6b7280; font-size: 14px;">
                Your no-dues clearance is now complete. Your certificate has been verified and approved.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">This is an automated email from JECRC No Dues System.</p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px; text-align: center;">© ${new Date().getFullYear()} JECRC University. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `.trim()
        });
        console.log(`✅ Approval email sent to ${entry.personal_email}`);
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
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
          action_by_user_id: user.id,
          action_at: new Date().toISOString()
        })
        .eq('form_id', entry_id)
        .eq('department_name', 'Department');

      if (statusError) {
        console.error('Error updating department status:', statusError);
      }

      // ===== SEND REJECTION EMAIL TO STUDENT =====
      try {
        await sendEmail({
          to: entry.personal_email,
          subject: `❌ Manual Entry Rejected - ${entry.registration_no}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
              <img src="https://jecrc.ac.in/wp-content/uploads/2023/06/logo-1.png" alt="JECRC" style="height: 60px; margin-bottom: 15px;"/>
              <h1 style="margin: 0; color: white; font-size: 24px;">JECRC University</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">No Dues Clearance System</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">Manual Entry Rejected</h2>
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Dear Student,
              </p>
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Your offline no-dues certificate submission has been <strong>rejected</strong> by the admin.
              </p>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0; color: #dc2626; font-size: 18px; font-weight: 600;">❌ Rejected</p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>Registration No:</strong> <span style="font-family: monospace; background: white; padding: 2px 6px; border-radius: 4px;">${entry.registration_no}</span></p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>School:</strong> ${entry.school}</p>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px;"><strong>Course:</strong> ${entry.course}</p>
                ${rejection_reason ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #fecaca;">
                  <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">Reason for Rejection</p>
                  <p style="margin: 0; color: #dc2626; font-size: 15px; font-style: italic;">"${rejection_reason}"</p>
                </div>
                ` : ''}
              </div>
              <p style="margin: 20px 0; color: #6b7280; font-size: 14px;">
                Please contact the admin office to understand the rejection reason and resolve any issues with your certificate.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">This is an automated email from JECRC No Dues System.</p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px; text-align: center;">© ${new Date().getFullYear()} JECRC University. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `.trim()
        });
        console.log(`✅ Rejection email sent to ${entry.personal_email}`);
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError);
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