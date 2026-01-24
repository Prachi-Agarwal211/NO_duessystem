export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';


// GET - Fetch active configuration for student form
// This is a public endpoint (no authentication required)
export async function GET(request) {
  try {
    // 🔍 DIAGNOSTIC: Check if Supabase client is initialized correctly
    if (supabaseAdmin.isMock) {
      console.error('❌ [ConfigAPI] Supabase client is using a MOCK because of missing ENV variables');
      return NextResponse.json({
        success: false,
        error: 'Backend Configuration Error: Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) are missing on the server. Please check your environment settings.',
        diagnostics: {
          url_env_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          key_env_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'schools', 'courses', 'branches', 'all'
    const schoolId = searchParams.get('school_id');
    const courseId = searchParams.get('course_id');

    // Fetch schools
    if (type === 'schools' || type === 'all') {
      console.log('📡 [ConfigAPI] Fetching schools...');
      const { data: schools, error: schoolsError } = await supabaseAdmin
        .from('config_schools')
        .select('id, name, display_order')
        .eq('is_active', true)
        .order('display_order');

      if (schoolsError) {
        console.error('❌ [ConfigAPI] Schools fetch error:', schoolsError);
        if (schoolsError.code === '42P01') {
          return NextResponse.json({
            success: false,
            error: 'Configuration tables (config_schools) not found. Please contact admin.',
            data: { schools: [], courses: [], branches: [] }
          }, { status: 503 });
        }
        throw schoolsError;
      }
      console.log(`✅ [ConfigAPI] Found ${schools.length} schools`);

      if (type === 'schools') {
        return NextResponse.json({ success: true, data: schools });
      }

      // If 'all', continue to fetch everything
      if (type === 'all') {
        console.log('📡 [ConfigAPI] Fetching courses and branches...');
        const [coursesResult, branchesResult] = await Promise.all([
          supabaseAdmin
            .from('config_courses')
            .select('id, school_id, name, display_order')
            .eq('is_active', true)
            .order('display_order'),
          supabaseAdmin
            .from('config_branches')
            .select('id, course_id, name, display_order')
            .eq('is_active', true)
            .order('display_order')
        ]);

        if (coursesResult.error) {
          console.error('❌ [ConfigAPI] Courses fetch error:', coursesResult.error);
          if (coursesResult.error.code === '42P01') {
            return NextResponse.json({
              success: false,
              error: 'Configuration tables (config_courses) not found.',
              data: { schools: schools || [], courses: [], branches: [] }
            }, { status: 503 });
          }
          throw coursesResult.error;
        }

        if (branchesResult.error) {
          console.error('❌ [ConfigAPI] Branches fetch error:', branchesResult.error);
          if (branchesResult.error.code === '42P01') {
            return NextResponse.json({
              success: false,
              error: 'Configuration tables (config_branches) not found.',
              data: { schools: schools || [], courses: coursesResult.data || [], branches: [] }
            }, { status: 503 });
          }
          throw branchesResult.error;
        }

        console.log(`✅ [ConfigAPI] Parallel fetch complete. Courses: ${coursesResult.data.length}, Branches: ${branchesResult.data.length}`);

        const { data: emailConfig, error: emailError } = await supabaseAdmin
          .from('config_emails')
          .select('key, value')
          .eq('key', 'college_domain')
          .single();

        if (emailError) console.warn('⚠️ [ConfigAPI] Email config fetch warning:', emailError.message);

        const { data: validationRules, error: validationError } = await supabaseAdmin
          .from('config_validation_rules')
          .select('*')
          .eq('is_active', true);

        if (validationError) console.warn('⚠️ [ConfigAPI] Validation rules fetch warning:', validationError.message);

        const { data: countryCodes, error: countryError } = await supabaseAdmin
          .from('config_country_codes')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (countryError) console.warn('⚠️ [ConfigAPI] Country codes fetch warning:', countryError.message);

        console.log('✅ [ConfigAPI] All configuration data retrieved successfully');

        console.log(`📊 [ConfigAPI] FINAL CHECK - Schools: ${schools?.length}, Courses: ${coursesResult.data?.length}`);

        return NextResponse.json({
          success: true,
          buildId: '25-Jan-00:15',
          data: {
            schools: schools || [],
            courses: coursesResult.data || [],
            branches: branchesResult.data || [],
            collegeDomain: emailConfig?.value || 'jecrcu.edu.in',
            validationRules: validationRules || [],
            countryCodes: countryCodes || [],
            // 📊 METADATA FOR DEBUGGING
            counts: {
              schools: schools?.length || 0,
              courses: coursesResult.data?.length || 0,
              branches: branchesResult.data?.length || 0
            }
          }
        });
      }
    }

    // Fetch courses by school
    if (type === 'courses') {
      if (!schoolId) {
        return NextResponse.json(
          { success: false, error: 'school_id parameter is required for courses' },
          { status: 400 }
        );
      }

      const { data: courses, error } = await supabaseAdmin
        .from('config_courses')
        .select('id, name, display_order')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      return NextResponse.json({ success: true, data: courses });
    }

    // Fetch branches by course
    if (type === 'branches') {
      if (!courseId) {
        return NextResponse.json(
          { success: false, error: 'course_id parameter is required for branches' },
          { status: 400 }
        );
      }

      const { data: branches, error } = await supabaseAdmin
        .from('config_branches')
        .select('id, name, display_order')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      return NextResponse.json({ success: true, data: branches });
    }

    // Fetch college email domain
    if (type === 'email-domain') {
      const { data, error } = await supabaseAdmin
        .from('config_emails')
        .select('value')
        .eq('key', 'college_domain')
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: { domain: data?.value || 'jecrcu.edu.in' }
      });
    }

    // Fetch validation rules
    if (type === 'validation_rules') {
      const { data, error } = await supabaseAdmin
        .from('config_validation_rules')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: data || []
      });
    }

    // Fetch country codes
    if (type === 'country_codes') {
      const { data, error } = await supabaseAdmin
        .from('config_country_codes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: data || []
      });
    }

    // Invalid type
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid type parameter. Use: schools, courses, branches, email-domain, validation_rules, country_codes, or all'
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Public config API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}