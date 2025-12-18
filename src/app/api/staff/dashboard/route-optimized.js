export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    // 1. Get Profile
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('assigned_department_ids, school_ids, role')
        .eq('id', user.id)
        .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 2. Resolve Departments
    const { data: depts } = await supabaseAdmin
        .from('departments')
        .select('name')
        .in('id', profile.assigned_department_ids || []);
    
    const myDeptNames = depts?.map(d => d.name) || [];

    if (myDeptNames.length === 0 && profile.role !== 'admin') {
        return NextResponse.json({ 
            success: true, 
            data: { 
                stats: { pending: 0, approved: 0, rejected: 0, total: 0 }, 
                applications: [] 
            } 
        });
    }

    // 3. Get Pending Applications (Optimized: specific columns only)
    let query = supabaseAdmin
        .from('no_dues_status')
        .select(`
            id,
            status,
            created_at,
            department_name,
            no_dues_forms!inner (
                id, 
                registration_no, 
                student_name, 
                course, 
                branch, 
                created_at, 
                status
            )
        `)
        .in('department_name', myDeptNames)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50); // Limit for performance

    // HOD Filter
    if (myDeptNames.includes('school_hod') && profile.school_ids?.length) {
        query = query.in('no_dues_forms.school_id', profile.school_ids);
    }

    const { data: applications } = await query;

    // 4. Get Counts (Parallel - Efficient)
    const [pendingResult, approvedResult, rejectedResult] = await Promise.all([
        supabaseAdmin
            .from('no_dues_status')
            .select('id', { count: 'exact', head: true })
            .in('department_name', myDeptNames)
            .eq('status', 'pending'),
        supabaseAdmin
            .from('no_dues_status')
            .select('id', { count: 'exact', head: true })
            .in('department_name', myDeptNames)
            .eq('status', 'approved'),
        supabaseAdmin
            .from('no_dues_status')
            .select('id', { count: 'exact', head: true })
            .in('department_name', myDeptNames)
            .eq('status', 'rejected')
    ]);

    const pending = pendingResult.count || 0;
    const approved = approvedResult.count || 0;
    const rejected = rejectedResult.count || 0;

    return NextResponse.json({
        success: true,
        data: {
            stats: {
                pending,
                approved,
                rejected,
                total: pending + approved + rejected
            },
            applications: applications || []
        }
    });

  } catch (error) {
    console.error('Staff Dashboard API Error:', error);
    return NextResponse.json({ 
        success: false, 
        error: error.message,
        data: { 
            stats: { pending: 0, approved: 0, rejected: 0, total: 0 }, 
            applications: [] 
        }
    }, { status: 500 });
  }
}