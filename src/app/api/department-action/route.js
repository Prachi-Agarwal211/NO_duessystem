import { NextResponse } from 'next/server';
import { jwtVerify, importJWK } from 'jose';
import applicationService from '@/lib/services/ApplicationService';

// Helper to verify JWT token
async function verifyToken(token) {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is not set');

        const jwk = { kty: 'oct', k: Buffer.from(secret).toString('base64') };
        const key = await importJWK(jwk, 'HS256');
        const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
        return payload;
    } catch (err) {
        throw new Error('Invalid or expired token');
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, status, reason, remarks, userId } = body;

        if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

        // 1. Verify Token
        const payload = await verifyToken(token);
        const { form_id, department } = payload;

        if (!form_id || !department) {
            return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
        }

        // 2. Perform Action using Prisma Service
        let result;
        if (status === 'Approved') {
            result = await applicationService.handleDepartmentApproval(
                form_id,
                department,
                remarks,
                userId
            );
        } else if (status === 'Rejected') {
            if (!reason) return NextResponse.json({ error: "Rejection reason required" }, { status: 400 });

            result = await applicationService.handleDepartmentRejection(
                form_id,
                department,
                reason,
                remarks,
                userId
            );
        } else {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Application ${status.toLowerCase()} successfully`,
            data: result.data
        });

    } catch (error) {
        console.error('Department Action Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || "Internal server error"
        }, { status: 500 });
    }
}
