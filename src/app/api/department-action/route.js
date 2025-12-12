import { createClient } from '@supabase/supabase-js';
import { jwtVerify, importJWK } from 'jose';
import { NextResponse } from 'next/server';
import { sendStatusUpdateToStudent, sendCertificateReadyNotification } from '@/lib/emailService';

// Initialize Supabase Admin Client to bypass RLS for server-side actions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const getJwk = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }
    return {
        kty: 'oct',
        k: Buffer.from(secret).toString('base64'),
    };
};

async function verifyToken(token) {
    try {
        const jwk = getJwk();
        const key = await importJWK(jwk, 'HS256');
        const { payload } = await jwtVerify(token, key, {
            // Add explicit verification options
            algorithms: ['HS256'],
            // Add a small clock tolerance for clock skew
            clockTolerance: 30, // 30 seconds
        });
        
        // Validate required fields
        if (!payload.user_id || !payload.form_id || !payload.department) {
            throw new Error('Token is missing required fields');
        }
        
        return payload;
    } catch (err) {
        if (err.code === 'ERR_JWT_EXPIRED') {
            throw new Error('Token has expired. Please request a new link.');
        }
        throw new Error(`Invalid token: ${err.message}`);
    }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required." }, { status: 400 });
    }

    // Verify the token and get the payload
    let payload;
    try {
      payload = await verifyToken(token);
    } catch (tokenError) {
      return NextResponse.json({ error: `Token verification failed: ${tokenError.message}` }, { status: 401 });
    }

    const { form_id, department } = payload;

    if (!form_id) {
      return NextResponse.json({ error: "Invalid token: Missing form_id" }, { status: 400 });
    }

    // Fetch form details using the admin client
    const { data: form, error } = await supabaseAdmin
      .from("no_dues_forms")
      .select("student_name, registration_no, contact_no")
      .eq("id", form_id)
      .single();

    if (error) {
      throw error;
    }
    
    if (!form) {
      return NextResponse.json({ error: "Form not found." }, { status: 404 });
    }

    return NextResponse.json({ ...form, department });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Invalid token or server error." }, { status: 500 });
  }
}

export async function POST(request) {
    try {
        // First try to get token from URL
        const { searchParams } = new URL(request.url);
        let token = searchParams.get("token");
        
        // Read the request body once
        let status, reason;
        try {
            const body = await request.json();
            if (!token) token = body.token;
            status = body.status;
            reason = body.reason;
        } catch (err) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        if (!token || !status) {
            return NextResponse.json({ error: "Token and status are required." }, { status: 400 });
        }

        if (status === 'Rejected' && !reason) {
            return NextResponse.json({ error: "Reason is required for rejection." }, { status: 400 });
        }

        const payload = await verifyToken(token);
        const { user_id, form_id, department } = payload;

        // STEP 1: Update the department status
        const { data, error } = await supabaseAdmin
            .from("no_dues_status")
            .update({
                status: status.toLowerCase(),
                rejection_reason: status === 'Rejected' ? reason : null,
                action_by_user_id: user_id,
                action_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq("form_id", form_id)
            .eq("department_name", department)
            .select();

        if (error) throw error;

        // STEP 2: Fetch student details for email notification
        const { data: formData, error: formError } = await supabaseAdmin
            .from('no_dues_forms')
            .select('student_name, registration_no, personal_email, status')
            .eq('id', form_id)
            .single();

        if (formError) {
            console.error('❌ Failed to fetch form data:', formError);
        }

        // STEP 3: Get department display name
        const { data: deptData } = await supabaseAdmin
            .from('config_departments')
            .select('display_name')
            .eq('name', department)
            .single();

        const departmentDisplayName = deptData?.display_name || department;

        // STEP 4: Send email notification to student
        if (formData && formData.personal_email) {
            try {
                const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://no-duessystem.vercel.app'}/student/check-status?reg=${formData.registration_no}`;
                
                await sendStatusUpdateToStudent({
                    studentEmail: formData.personal_email,
                    studentName: formData.student_name,
                    registrationNo: formData.registration_no,
                    departmentName: departmentDisplayName,
                    action: status.toLowerCase(),
                    rejectionReason: status === 'Rejected' ? reason : null,
                    statusUrl
                });

                console.log(`✅ Sent ${status} notification to ${formData.personal_email}`);
            } catch (emailError) {
                console.error('❌ Failed to send student notification (non-fatal):', emailError);
                // Don't fail the request if email fails
            }
        }

        // STEP 5: Check if ALL departments approved → Send certificate email
        if (status.toLowerCase() === 'approved') {
            try {
                const { data: allStatuses, error: statusError } = await supabaseAdmin
                    .from('no_dues_status')
                    .select('status')
                    .eq('form_id', form_id);

                if (!statusError && allStatuses) {
                    const totalDepts = allStatuses.length;
                    const approvedDepts = allStatuses.filter(s => s.status === 'approved').length;

                    console.log(`📊 Progress: ${approvedDepts}/${totalDepts} departments approved`);

                    // If ALL departments approved, send certificate ready email
                    if (approvedDepts === totalDepts && formData?.personal_email) {
                        const certificateUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://no-duessystem.vercel.app'}/student/check-status?reg=${formData.registration_no}`;
                        
                        await sendCertificateReadyNotification({
                            studentEmail: formData.personal_email,
                            studentName: formData.student_name,
                            registrationNo: formData.registration_no,
                            certificateUrl
                        });

                        console.log(`🎓 Certificate ready email sent to ${formData.personal_email}`);
                    }
                }
            } catch (certError) {
                console.error('❌ Certificate notification failed (non-fatal):', certError);
            }
        }

        return NextResponse.json({
            ok: true,
            message: "Status updated successfully.",
            emailSent: true
        });
    } catch (err) {
        return NextResponse.json({ error: err.message || "Failed to update status." }, { status: 500 });
    }
}
