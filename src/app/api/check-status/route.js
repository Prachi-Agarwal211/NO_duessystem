export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

// ✅ CRITICAL FIX: Force real-time data, NO CACHING
// Removed in-memory cache to ensure librarian sees updates immediately
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          cache: 'no-store', // Force fresh data from Supabase
        });
      },
    },
  }
);

/**
 * GET /api/check-status?registration_no=XXX
 * Optimized endpoint for checking form status
 * 
 * This replaces direct Supabase queries in StatusTracker for better performance
 */
export async function GET(request) {
  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      return NextResponse.json({
        success: false,
        error: 'Server configuration error'
      }, { status: 500 });
    }

    // Rate limiting
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.READ);
    if (!rateLimitCheck.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitCheck.error || 'Too many requests',
        retryAfter: rateLimitCheck.retryAfter
      }, {
        status: 429,
        headers: {
          'Retry-After': (rateLimitCheck.retryAfter || 60).toString()
        }
      });
    }

    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');

    // Validation
    if (!registrationNo || typeof registrationNo !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid registration number'
      }, { status: 400 });
    }

    // ✅ NO CACHING: Always fetch fresh data from database
    // OPTIMIZATION: Single optimized query with proper indexing
    // ✅ FIXED: Removed manual entry fields (now in separate table)
    const { data: form, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        admission_year,
        passing_year,
        parent_name,
        school,
        school_id,
        course,
        course_id,
        branch,
        branch_id,
        country_code,
        contact_no,
        personal_email,
        college_email,
        status,
        created_at,
        updated_at,
        reapplication_count,
        last_reapplied_at,
        student_reply_message,
        certificate_url,
        rejection_reason,
        rejection_context
      `)
      .eq('registration_no', registrationNo.trim().toUpperCase())
      .single();

    if (formError) {
      if (formError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'No form found for this registration number',
          notFound: true
        }, { status: 404 });
      }
      console.error('Form query error:', formError);
      throw formError;
    }

    if (!form) {
      return NextResponse.json({
        success: false,
        error: 'Form not found',
        notFound: true
      }, { status: 404 });
    }

    // ✅ FIXED: All forms are now online-only (manual entries in separate table)
    // OPTIMIZATION: Parallel queries for departments and statuses
    let departments, deptError, statuses, statusError;
    [
      { data: departments, error: deptError },
      { data: statuses, error: statusError }
    ] = await Promise.all([
      supabaseAdmin
        .from('departments')
        .select('name, display_name, display_order, is_active')
        .eq('is_active', true)
        .order('display_order'),
      supabaseAdmin
        .from('no_dues_status')
        .select('department_name, status, action_at, rejection_reason, action_by_user_id')
        .eq('form_id', form.id)
    ]);

    if (deptError) {
      console.error('Departments query error:', deptError);
      throw deptError;
    }

    if (statusError) {
      console.error('Status query error:', statusError);
      throw statusError;
    }

    // 🔧 CRITICAL FIX: If no department statuses exist, create them
    if (!statuses || statuses.length === 0) {
      console.warn(`⚠️ No department statuses found for form ${form.id}. Creating them now...`);
      
      // Create missing department status records
      const departmentInserts = (departments || []).map(dept => ({
        form_id: form.id,
        department_name: dept.name,
        status: 'pending'
      }));

      if (departmentInserts.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('no_dues_status')
          .insert(departmentInserts);

        if (insertError) {
          console.error('Failed to create department statuses:', insertError);
        } else {
          console.log(`✅ Created ${departmentInserts.length} department status records`);
          // Re-fetch the newly created statuses
          const { data: newStatuses } = await supabaseAdmin
            .from('no_dues_status')
            .select('department_name, status, action_at, rejection_reason, action_by_user_id')
            .eq('form_id', form.id);
          statuses = newStatuses || [];
        }
      }
    }

    // Merge department data with status data
    const statusData = (departments || []).map(dept => {
      const status = (statuses || []).find(s => s.department_name === dept.name);
      return {
        department_name: dept.name,
        display_name: dept.display_name,
        status: status?.status || 'pending',
        action_at: status?.action_at || null,
        rejection_reason: status?.rejection_reason || null,
        action_by_user_id: status?.action_by_user_id || null,
      };
    });

    // 🐛 DEBUG LOGGING - Track what's being returned
    console.log(`📊 Check Status Debug for ${registrationNo}:`, {
      formStatus: form.status,
      hasRejectionContext: !!form.rejection_context,
      rejectionContext: form.rejection_context,
      departmentCount: departments?.length || 0,
      statusRecordCount: statuses?.length || 0,
      statusDataCount: statusData.length,
      rejectedDepts: statusData.filter(s => s.status === 'rejected').length
    });

    // Prepare response data
    const responseData = {
      success: true,
      data: {
        form: {
          ...form,
          display_status: form.status
        },
        statusData
      }
    };

    // ✅ NO CACHING: Return fresh data with strict no-cache headers
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('❌ Check Status API Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details
    });
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}