export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import supabase from '@/lib/supabaseClient';

/**
 * GET /api/check-status?registration_no=XXX
 * Optimized endpoint for checking form status
 * 
 * This replaces direct Supabase queries in StatusTracker for better performance
 */
export async function GET(request) {
  try {
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

    // ✅ NO CACHING: Always fetch fresh data from database with explicit cache headers
    // OPTIMIZATION: Single optimized query with proper indexing
    // ✅ FIXED: Removed manual entry fields (now in separate table)
    // 🛡️ DEFENSIVE: Force fresh query to prevent stale data issues
    const { data: form, error: formError } = await supabase
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
      .order('created_at', { ascending: false })
      .single();

    if (formError && formError.code !== 'PGRST116') { // PGRST116 is "Row not found"
      console.error('Form lookup error:', formError);
      throw formError;
    }

    if (!form) {
      return NextResponse.json({
        success: false,
        error: 'No form found for this registration number',
        notFound: true
      }, { status: 404 });
    }

    // ✅ FIXED: All forms are now online-only (manual entries in separate table)
    // OPTIMIZATION: Parallel queries for departments and statuses
    const [departmentsResult, statusesResult] = await Promise.all([
      supabase
        .from('departments')
        .select('name, display_name, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('no_dues_status')
        .select('department_name, status, action_at, rejection_reason, action_by_user_id')
        .eq('form_id', form.id)
    ]);

    if (departmentsResult.error) throw departmentsResult.error;
    if (statusesResult.error) throw statusesResult.error;

    const departments = departmentsResult.data;
    const statuses = statusesResult.data;

    // 🔧 CRITICAL FIX: If no department statuses exist, create them
    if (!statuses || statuses.length === 0) {
      console.warn(`⚠️ No department statuses found for form ${form.id}. Creating them now...`);

      // Create missing department status records
      const departmentInserts = departments.map(dept => ({
        form_id: form.id,
        department_name: dept.name,
        status: 'pending'
      }));

      if (departmentInserts.length > 0) {
        try {
          // Insert department statuses one by one to handle duplicates
          for (const insert of departmentInserts) {
            const { error: insertError } = await supabase
              .from('no_dues_status')
              .insert(insert)
              .select()
              .single(); // Using single() to handle unique constraint violations gracefully

            // If there's a unique violation, it means the record already exists, which is fine
            if (insertError && insertError.code !== '23505') {
              console.error('Insert error:', insertError);
            }
          }
          console.log(`✅ Attempted to create ${departmentInserts.length} department status records`);

          // Re-fetch the newly created statuses
          const { data: newStatuses, error: statusFetchError } = await supabase
            .from('no_dues_status')
            .select('department_name, status, action_at, rejection_reason, action_by_user_id')
            .eq('form_id', form.id);

          if (!statusFetchError) {
            statuses = newStatuses;
          }
        } catch (insertError) {
          console.error('Failed to create department statuses:', insertError);
        }
      }
    }

    // Merge department data with status data
    const statusData = departments.map(dept => {
      const status = statuses.find(s => s.department_name === dept.name);
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
      formId: form.id, // Log form ID for tracking
      formStatus: form.status,
      hasRejectionContext: !!form.rejection_context,
      rejectionContext: form.rejection_context,
      departmentCount: departments?.length || 0,
      statusRecordCount: statuses?.length || 0,
      statusDataCount: statusData.length,
      rejectedDepts: statusData.filter(s => s.status === 'rejected').length,
      timestamp: new Date().toISOString()
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