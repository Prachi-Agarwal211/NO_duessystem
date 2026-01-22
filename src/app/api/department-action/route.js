import { createClient } from '@supabase/supabase-js';
import { jwtVerify, importJWK } from 'jose';
import { NextResponse } from 'next/server';
import { sendRejectionNotification, sendCertificateReadyNotification } from '@/lib/emailService';
import { APP_URLS, EMAIL_URLS } from '@/lib/urlHelper';
import applicationService from '@/lib/services/ApplicationService';

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

        // If not in URL, try body
        if (!token) {
            const body = await request.json();
            token = body.token;
        }

        // Read the request body for action data
        let status, reason, userId, departmentName, remarks;
        const body = await request.json();
        status = body.status;
        reason = body.reason;
        userId = body.userId;
        departmentName = body.departmentName;
        remarks = body.remarks;

        // Validate inputs
        if (!token) {
            return NextResponse.json({ error: "Token is required." }, { status: 400 });
        }

        if (!status || !['Approved', 'Rejected'].includes(status)) {
            return NextResponse.json({ error: "Valid status (Approved/Rejected) is required." }, { status: 400 });
        }

        if (status === 'Rejected' && !reason) {
            return NextResponse.json({ error: "Reason is required for rejection." }, { status: 400 });
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

        // Get form details
        const { data: form, error } = await supabaseAdmin
            .from("no_dues_forms")
            .select("id, student_name, registration_no, contact_no, personal_email, college_email, status")
            .eq("id", form_id)
            .single();

        if (error) throw error;
        if (!form) return NextResponse.json({ error: "Form not found." }, { status: 404 });

        // Handle rejection using unified application service
        if (status === 'Rejected') {
            const rejectionResult = await applicationService.handleDepartmentRejection(
                form_id,
                department,
                reason,
                remarks,
                userId || department
            );

            return NextResponse.json({
                success: true,
                message: `Application rejected successfully. Reason: ${reason}`,
                data: rejectionResult.data
            });
        }

        // Handle approval using unified application service
        if (status === 'Approved') {
            const approvalResult = await applicationService.handleDepartmentApproval(
                form_id,
                department,
                remarks,
                userId || department
            );

            return NextResponse.json({
                success: true,
                message: `Application approved successfully`,
                data: approvalResult.data
            });
        }

    } catch (err) {
        console.error('Department action error:', err);
        return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
    }
}
