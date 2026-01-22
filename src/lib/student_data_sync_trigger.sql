-- ============================================================================
-- STUDENT DATA MASTER SYNC TRIGGER
-- ============================================================================

-- Function: Sync no_dues_forms data back to student_data master table
CREATE OR REPLACE FUNCTION public.sync_and_enrich_master_data()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id UUID;
    v_course_id UUID;
    v_branch_id UUID;
    v_school_name TEXT;
    v_course_name TEXT;
    v_branch_name TEXT;
BEGIN
    -- 1. Ensure we have Names (prioritize names from form)
    v_school_name := COALESCE(NEW.school, '');
    v_course_name := COALESCE(NEW.course, '');
    v_branch_name := COALESCE(NEW.branch, '');

    -- 2. Resolve/Create School
    IF NEW.school_id IS NOT NULL THEN
        v_school_id := NEW.school_id;
    ELSIF v_school_name != '' THEN
        SELECT id INTO v_school_id FROM config_schools WHERE LOWER(name) = LOWER(v_school_name);
        IF v_school_id IS NULL THEN
            INSERT INTO config_schools (name) VALUES (v_school_name) RETURNING id INTO v_school_id;
        END IF;
    END IF;

    -- 3. Resolve/Create Course
    IF NEW.course_id IS NOT NULL THEN
        v_course_id := NEW.course_id;
    ELSIF v_course_name != '' AND v_school_id IS NOT NULL THEN
        SELECT id INTO v_course_id FROM config_courses WHERE school_id = v_school_id AND LOWER(name) = LOWER(v_course_name);
        IF v_course_id IS NULL THEN
            INSERT INTO config_courses (school_id, name) VALUES (v_school_id, v_course_name) RETURNING id INTO v_course_id;
        END IF;
    END IF;

    -- 4. Resolve/Create Branch
    IF NEW.branch_id IS NOT NULL THEN
        v_branch_id := NEW.branch_id;
    ELSIF v_branch_name != '' AND v_course_id IS NOT NULL THEN
        SELECT id INTO v_branch_id FROM config_branches WHERE course_id = v_course_id AND LOWER(name) = LOWER(v_branch_name);
        IF v_branch_id IS NULL THEN
            INSERT INTO config_branches (course_id, name) VALUES (v_course_id, v_branch_name) RETURNING id INTO v_branch_id;
        END IF;
    END IF;

    -- 5. Upsert into student_data
    INSERT INTO public.student_data (
        registration_no,
        student_name,
        admission_year,
        passing_year,
        parent_name,
        school_id,
        school,
        course_id,
        course,
        branch_id,
        branch,
        country_code,
        contact_no,
        personal_email,
        college_email,
        alumni_profile_link,
        no_dues_status,
        last_form_id,
        certificate_generated,
        certificate_url,
        data_source,
        status
    )
    VALUES (
        NEW.registration_no,
        NEW.student_name,
        NULLIF(NEW.admission_year, '')::INTEGER,
        NULLIF(NEW.passing_year, '')::INTEGER,
        NEW.parent_name,
        v_school_id,
        v_school_name,
        v_course_id,
        v_course_name,
        v_branch_id,
        v_branch_name,
        NEW.country_code,
        NEW.contact_no,
        NEW.personal_email,
        NEW.college_email,
        NEW.alumni_profile_link,
        NEW.status,
        NEW.id,
        COALESCE(NEW.final_certificate_generated, false),
        NEW.certificate_url,
        'manual',
        'active'
    )
    ON CONFLICT (registration_no) DO UPDATE SET
        student_name = EXCLUDED.student_name,
        admission_year = COALESCE(student_data.admission_year, EXCLUDED.admission_year),
        passing_year = COALESCE(student_data.passing_year, EXCLUDED.passing_year),
        parent_name = COALESCE(student_data.parent_name, EXCLUDED.parent_name),
        school_id = EXCLUDED.school_id,
        school = EXCLUDED.school,
        course_id = EXCLUDED.course_id,
        course = EXCLUDED.course,
        branch_id = EXCLUDED.branch_id,
        branch = EXCLUDED.branch,
        country_code = EXCLUDED.country_code,
        contact_no = EXCLUDED.contact_no,
        personal_email = EXCLUDED.personal_email,
        college_email = EXCLUDED.college_email,
        alumni_profile_link = EXCLUDED.alumni_profile_link,
        no_dues_status = EXCLUDED.no_dues_status,
        last_form_id = EXCLUDED.last_form_id,
        certificate_generated = EXCLUDED.certificate_generated,
        certificate_url = EXCLUDED.certificate_url,
        last_updated_at = NOW(),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Triggers
DROP TRIGGER IF EXISTS tr_sync_form_to_master ON public.no_dues_forms;

CREATE TRIGGER tr_sync_form_to_master
    AFTER INSERT OR UPDATE ON public.no_dues_forms
    FOR EACH ROW EXECUTE FUNCTION public.sync_and_enrich_master_data();

COMMENT ON FUNCTION public.sync_and_enrich_master_data() IS 'Automatically syncs and enriches the student_data master table whenever a no-dues form is submitted or updated';
