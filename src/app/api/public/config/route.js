export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';


// GET - Fetch active configuration for student form
// This is a public endpoint (no authentication required)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'schools', 'courses', 'branches', 'all'
    const schoolId = searchParams.get('school_id');
    const courseId = searchParams.get('course_id');

    // Fetch schools
    if (type === 'schools' || type === 'all') {
      const { data: schools, error: schoolsError } = await supabaseAdmin
        .from('config_schools')
        .select('id, name, display_order')
        .eq('is_active', true)
        .order('display_order');

      if (schoolsError) {
        console.error('❌ Error fetching schools:', schoolsError);
        // Return empty array if table doesn't exist instead of crashing
        if (schoolsError.code === '42P01') {
          return NextResponse.json({
            success: false,
            error: 'Configuration tables not set up. Please run database migration scripts.',
            data: { schools: [], courses: [], branches: [] }
          }, { status: 503 });
        }
        throw schoolsError;
      }

      if (type === 'schools') {
        return NextResponse.json({ success: true, data: schools });
      }

      // If 'all', continue to fetch everything
      if (type === 'all') {
        const { data: courses, error: coursesError } = await supabaseAdmin
          .from('config_courses')
          .select('id, school_id, name, display_order')
          .eq('is_active', true)
          .order('display_order');

        if (coursesError) {
          console.error('❌ Error fetching courses:', coursesError);
          if (coursesError.code === '42P01') {
            return NextResponse.json({
              success: false,
              error: 'Configuration tables not set up. Please run database migration scripts.',
              data: { schools: schools || [], courses: [], branches: [] }
            }, { status: 503 });
          }
          throw coursesError;
        }

        const { data: branches, error: branchesError } = await supabaseAdmin
          .from('config_branches')
          .select('id, course_id, name, display_order')
          .eq('is_active', true)
          .order('display_order');

        if (branchesError) {
          console.error('❌ Error fetching branches:', branchesError);
          if (branchesError.code === '42P01') {
            return NextResponse.json({
              success: false,
              error: 'Configuration tables not set up. Please run database migration scripts.',
              data: { schools: schools || [], courses: courses || [], branches: [] }
            }, { status: 503 });
          }
          throw branchesError;
        }

        const { data: emailConfig, error: emailError } = await supabaseAdmin
          .from('config_emails')
          .select('key, value')
          .eq('key', 'college_domain')
          .single();

        if (emailError) console.error('Email config error:', emailError);

        const { data: validationRules, error: validationError } = await supabaseAdmin
          .from('config_validation_rules')
          .select('*')
          .eq('is_active', true);

        if (validationError) console.error('Validation rules error:', validationError);

        const { data: countryCodes, error: countryError } = await supabaseAdmin
          .from('config_country_codes')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (countryError) console.error('Country codes error:', countryError);

        return NextResponse.json({
          success: true,
          data: {
            schools,
            courses,
            branches,
            collegeDomain: emailConfig?.value || 'jecrcu.edu.in',
            validationRules: validationRules || [],
            countryCodes: countryCodes || []
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