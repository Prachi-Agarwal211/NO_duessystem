export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
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

    // OPTIMIZATION: Single optimized query with proper indexing
    // Instead of multiple separate queries, we do one query with joins
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
        is_manual_entry,
        manual_certificate_url,
        rejection_reason
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

    // ✅ Check if this is a manual entry (admin-only workflow)
    const isManualEntry = form.is_manual_entry === true;

    // OPTIMIZATION: Parallel queries for departments and statuses
    // Using let instead of const to allow reassignment of statuses in line 148
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
      // ALWAYS fetch department statuses - we'll filter display logic in frontend
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

    // 🔧 CRITICAL FIX: For online forms, if no department statuses exist, create them
    if (!isManualEntry && (!statuses || statuses.length === 0)) {
      console.warn(`⚠️ No department statuses found for online form ${form.id}. Creating them now...`);
      
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
    // ✅ For manual entries, return empty statusData (handled by frontend)
    const statusData = isManualEntry ? [] : (departments || []).map(dept => {
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
      isManualEntry,
      formStatus: form.status,
      departmentCount: departments?.length || 0,
      statusRecordCount: statuses?.length || 0,
      statusDataCount: statusData.length,
      rejectedDepts: statusData.filter(s => s.status === 'rejected').length
    });

    // Return optimized response
    return NextResponse.json({
      success: true,
      data: {
        form,
        statusData
      }
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Check Status API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}