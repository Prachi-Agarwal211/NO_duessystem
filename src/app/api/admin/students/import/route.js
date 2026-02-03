import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client to bypass RLS for bulk import
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
    try {
        // Auth check
        const authHeader = request.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);

        // Verify admin role - query by email first (handles ID mismatches)
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('email', user.email.toLowerCase())
            .single();
        if (!profile || profile.role !== 'admin') {
            // Fallback to ID lookup
            const { data: profileById } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (!profileById || profileById.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const text = await file.text();
        const rows = text.split('\n');
        const headers = rows[0].split(',').map(h => h.trim());

        // Required headers mapping
        const required = ['registration_no', 'student_name', 'personal_email', 'college_email'];
        const missing = required.filter(r => !headers.includes(r));

        if (missing.length > 0) {
            return NextResponse.json({ error: `Missing columns: ${missing.join(', ')}` }, { status: 400 });
        }

        const processRow = (row) => {
            const values = row.split(',');
            if (values.length < headers.length) return null;
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = values[i]?.trim();
            });
            return obj;
        };

        const students = rows.slice(1).map(processRow).filter(r => r && r.registration_no);

        // Default password handling (in real app, send invite)
        // Here we just upsert to student_master

        const { data, error } = await supabaseAdmin
            .from('student_master')
            .upsert(students, {
                onConflict: 'registration_no',
                ignoreDuplicates: false
            });

        if (error) {
            console.error(error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: students.length });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
