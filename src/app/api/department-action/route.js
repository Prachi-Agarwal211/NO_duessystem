import { createClient } from '@supabase/supabase-js';
import { jwtVerify, importJWK } from 'jose';
import { NextResponse } from 'next/server';

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

        // Update the status
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
            .select(); // Include .select() to get updated rows

        if (!data || data.length === 0) {
            // This might happen if the record doesn't exist or the update didn't change anything
            // We'll still consider it a success if no error was thrown
        }

        if (error) throw error;

        return NextResponse.json({ ok: true, message: "Status updated successfully." });
    } catch (err) {
        return NextResponse.json({ error: err.message || "Failed to update status." }, { status: 500 });
    }
}
