-- ============================================================================
-- STUDENT_DATA TABLE - For 29,000+ students auto-fetch functionality
-- ============================================================================

-- Create student_data table if not exists
CREATE TABLE IF NOT EXISTS public.student_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_no TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    admission_year INTEGER,
    passing_year INTEGER,
    parent_name TEXT,
    
    -- Config Mapping (UUIDs and Names)
    school_id UUID REFERENCES public.config_schools(id),
    school TEXT,
    course_id UUID REFERENCES public.config_courses(id),
    course TEXT,
    branch_id UUID REFERENCES public.config_branches(id),
    branch TEXT,
    
    country_code TEXT DEFAULT '+91',
    contact_no TEXT,
    personal_email TEXT,
    college_email TEXT,
    email TEXT, -- Additional email field
    alumni_profile_link TEXT, -- Alumni profile link
    alumni_screenshot_url TEXT, -- Alumni screenshot URL
    
    -- Additional fields that might be in Excel data
    batch TEXT,
    section TEXT,
    semester INTEGER,
    cgpa DECIMAL(3,2),
    backlogs INTEGER DEFAULT 0,
    roll_number TEXT,
    enrollment_number TEXT,
    date_of_birth DATE,
    gender TEXT,
    category TEXT,
    blood_group TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pin_code TEXT,
    emergency_contact_name TEXT,
    emergency_contact_no TEXT,
    
    -- No Dues Sync Status (Live Tracking)
    no_dues_status TEXT DEFAULT 'not_applied' CHECK (no_dues_status IN ('not_applied', 'pending', 'rejected', 'completed')),
    last_form_id UUID, -- Reference to no_dues_forms(id) but no FKey to allow deletion of forms if needed
    certificate_generated BOOLEAN DEFAULT false,
    certificate_url TEXT,
    
    -- Status and metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred', 'dropped_out')),
    data_source TEXT DEFAULT 'manual' CHECK (data_source IN ('manual', 'import', 'erp', 'excel')),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance (critical for 29,000+ records)
CREATE INDEX IF NOT EXISTS idx_student_data_regno ON public.student_data(registration_no);
CREATE INDEX IF NOT EXISTS idx_student_data_name ON public.student_data(student_name);
CREATE INDEX IF NOT EXISTS idx_student_data_school ON public.student_data(school);
CREATE INDEX IF NOT EXISTS idx_student_data_course ON public.student_data(course);
CREATE INDEX IF NOT EXISTS idx_student_data_branch ON public.student_data(branch);
CREATE INDEX IF NOT EXISTS idx_student_data_status ON public.student_data(status);
CREATE INDEX IF NOT EXISTS idx_student_data_admission_year ON public.student_data(admission_year);

-- Enable Row Level Security
ALTER TABLE public.student_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public read student_data for auto-fetch" ON public.student_data;
CREATE POLICY "Public read student_data for auto-fetch" ON public.student_data FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage student_data" ON public.student_data;
CREATE POLICY "Admin manage student_data" ON public.student_data FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Function to search students by registration number or name
DROP FUNCTION IF EXISTS public.search_student_data(search_term TEXT);
CREATE OR REPLACE FUNCTION public.search_student_data(search_term TEXT)
RETURNS TABLE (
    registration_no TEXT,
    student_name TEXT,
    admission_year INTEGER,
    passing_year INTEGER,
    parent_name TEXT,
    school_id UUID,
    school TEXT,
    course_id UUID,
    course TEXT,
    branch_id UUID,
    branch TEXT,
    contact_no TEXT,
    personal_email TEXT,
    college_email TEXT,
    no_dues_status TEXT,
    certificate_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sd.registration_no,
        sd.student_name,
        sd.admission_year,
        sd.passing_year,
        sd.parent_name,
        sd.school_id,
        sd.school,
        sd.course_id,
        sd.course,
        sd.branch_id,
        sd.branch,
        sd.contact_no,
        sd.personal_email,
        sd.college_email,
        sd.no_dues_status,
        sd.certificate_url
    FROM public.student_data sd
    WHERE 
        -- Exact match for registration number (prioritized)
        LOWER(sd.registration_no) = LOWER(search_term)
        OR
        -- Partial match for name (fallback)
        (LOWER(sd.student_name) LIKE '%' || LOWER(search_term) || '%' AND status = 'active')
    ORDER BY 
        -- Exact registration number match first
        CASE WHEN LOWER(sd.registration_no) = LOWER(search_term) THEN 1 ELSE 2 END,
        sd.student_name
    LIMIT 10; -- Limit to prevent too many results
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to map Excel data to student_data table format
DROP FUNCTION IF EXISTS public.map_excel_to_student_data(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.map_excel_to_student_data(
    excel_registration_no TEXT,
    excel_student_name TEXT,
    excel_school TEXT,
    excel_course TEXT,
    excel_branch TEXT,
    excel_admission_year TEXT,
    excel_passing_year TEXT,
    excel_parent_name TEXT,
    excel_country_code TEXT,
    excel_contact_no TEXT,
    excel_personal_email TEXT,
    excel_college_email TEXT,
    excel_alumni_profile_link TEXT,
    excel_alumni_screenshot_url TEXT,
    excel_batch TEXT,
    excel_section TEXT,
    excel_semester TEXT,
    excel_cgpa TEXT,
    excel_backlogs TEXT,
    excel_roll_number TEXT,
    excel_enrollment_number TEXT,
    excel_date_of_birth TEXT,
    excel_gender TEXT,
    excel_category TEXT,
    excel_blood_group TEXT,
    excel_address TEXT,
    excel_city TEXT,
    excel_state TEXT,
    excel_pin_code TEXT,
    excel_emergency_contact_name TEXT,
    excel_emergency_contact_no TEXT
)
RETURNS UUID AS $$
DECLARE
    student_id UUID;
    v_school_id UUID;
    v_course_id UUID;
    v_branch_id UUID;
    normalized_school TEXT;
    normalized_course TEXT;
    normalized_branch TEXT;
BEGIN
    -- Set defaults for null values
    excel_country_code := COALESCE(excel_country_code, '+91');
    excel_alumni_screenshot_url := COALESCE(excel_alumni_screenshot_url, NULL);
    excel_batch := COALESCE(excel_batch, NULL);
    excel_section := COALESCE(excel_section, NULL);
    excel_semester := COALESCE(excel_semester, NULL);
    excel_cgpa := COALESCE(excel_cgpa, NULL);
    excel_backlogs := COALESCE(excel_backlogs, '0');
    excel_roll_number := COALESCE(excel_roll_number, NULL);
    excel_enrollment_number := COALESCE(excel_enrollment_number, NULL);
    excel_date_of_birth := COALESCE(excel_date_of_birth, NULL);
    excel_gender := COALESCE(excel_gender, NULL);
    excel_category := COALESCE(excel_category, NULL);
    excel_blood_group := COALESCE(excel_blood_group, NULL);
    excel_address := COALESCE(excel_address, NULL);
    excel_city := COALESCE(excel_city, NULL);
    excel_state := COALESCE(excel_state, NULL);
    excel_pin_code := COALESCE(excel_pin_code, NULL);
    excel_emergency_contact_name := COALESCE(excel_emergency_contact_name, NULL);
    excel_emergency_contact_no := COALESCE(excel_emergency_contact_no, NULL);
    -- Normalize input strings for matching
    normalized_school := LOWER(TRIM(excel_school));
    normalized_course := LOWER(TRIM(excel_course));
    normalized_branch := LOWER(TRIM(excel_branch));
    
    -- Find matching school, create if not exists
    SELECT id INTO v_school_id 
    FROM config_schools 
    WHERE LOWER(name) = normalized_school;
    
    IF v_school_id IS NULL AND normalized_school != '' THEN
        INSERT INTO config_schools (name, display_order)
        VALUES (TRIM(excel_school), (SELECT COALESCE(MAX(display_order), 0) + 1 FROM config_schools))
        RETURNING id INTO v_school_id;
    END IF;
    
    -- Find matching course (only if school found), create if not exists
    IF v_school_id IS NOT NULL THEN
        SELECT id INTO v_course_id
        FROM config_courses
        WHERE school_id = v_school_id
        AND LOWER(name) = normalized_course;
        
        IF v_course_id IS NULL AND normalized_course != '' THEN
            INSERT INTO config_courses (school_id, name, display_order)
            VALUES (v_school_id, TRIM(excel_course), (SELECT COALESCE(MAX(display_order), 0) + 1 FROM config_courses WHERE school_id = v_school_id))
            RETURNING id INTO v_course_id;
        END IF;
    END IF;
    
    -- Find matching branch (only if course found), create if not exists
    IF v_course_id IS NOT NULL THEN
        SELECT id INTO v_branch_id
        FROM config_branches
        WHERE course_id = v_course_id
        AND LOWER(name) = normalized_branch;
        
        IF v_branch_id IS NULL AND normalized_branch != '' THEN
            INSERT INTO config_branches (course_id, name, display_order)
            VALUES (v_course_id, TRIM(excel_branch), (SELECT COALESCE(MAX(display_order), 0) + 1 FROM config_branches WHERE course_id = v_course_id))
            RETURNING id INTO v_branch_id;
        END IF;
    END IF;
    
    -- Insert student data
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
        alumni_screenshot_url,
        batch,
        section,
        semester,
        cgpa,
        backlogs,
        roll_number,
        enrollment_number,
        date_of_birth,
        gender,
        category,
        blood_group,
        address,
        city,
        state,
        pin_code,
        emergency_contact_name,
        emergency_contact_no,
        data_source,
        status,
        no_dues_status
    ) VALUES (
        COALESCE(TRIM(excel_registration_no), ''),
        COALESCE(TRIM(excel_student_name), ''),
        CASE WHEN excel_admission_year ~ '^[0-9]{4}$' THEN CAST(excel_admission_year AS INTEGER) ELSE NULL END,
        CASE WHEN excel_passing_year ~ '^[0-9]{4}$' THEN CAST(excel_passing_year AS INTEGER) ELSE NULL END,
        COALESCE(TRIM(excel_parent_name), ''),
        v_school_id,
        COALESCE((SELECT name FROM config_schools WHERE id = v_school_id), TRIM(excel_school)),
        v_course_id,
        COALESCE((SELECT name FROM config_courses WHERE id = v_course_id), TRIM(excel_course)),
        v_branch_id,
        COALESCE((SELECT name FROM config_branches WHERE id = v_branch_id), TRIM(excel_branch)),
        COALESCE(TRIM(excel_country_code), '+91'),
        COALESCE(TRIM(excel_contact_no), ''),
        COALESCE(TRIM(excel_personal_email), ''),
        COALESCE(TRIM(excel_college_email), ''),
        COALESCE(TRIM(excel_alumni_profile_link), ''),
        TRIM(excel_alumni_screenshot_url),
        TRIM(excel_batch),
        TRIM(excel_section),
        CASE WHEN excel_semester ~ '^[0-9]+$' THEN CAST(excel_semester AS INTEGER) ELSE NULL END,
        CASE WHEN excel_cgpa ~ '^[0-9]*\.?[0-9]+$' THEN CAST(excel_cgpa AS DECIMAL(3,2)) ELSE NULL END,
        CASE WHEN excel_backlogs ~ '^[0-9]+$' THEN CAST(excel_backlogs AS INTEGER) ELSE 0 END,
        TRIM(excel_roll_number),
        TRIM(excel_enrollment_number),
        CASE WHEN excel_date_of_birth ~ '^\d{4}-\d{2}-\d{2}$' THEN CAST(excel_date_of_birth AS DATE) ELSE NULL END,
        TRIM(excel_gender),
        TRIM(excel_category),
        TRIM(excel_blood_group),
        TRIM(excel_address),
        TRIM(excel_city),
        TRIM(excel_state),
        TRIM(excel_pin_code),
        TRIM(excel_emergency_contact_name),
        TRIM(excel_emergency_contact_no),
        'excel',
        'active',
        'not_applied'
    )
    RETURNING id INTO student_id;
    
    RETURN student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get student by registration number (exact match)
DROP FUNCTION IF EXISTS public.get_student_by_regno(reg_no_param TEXT);
CREATE OR REPLACE FUNCTION public.get_student_by_regno(reg_no_param TEXT)
RETURNS TABLE (
    registration_no TEXT,
    student_name TEXT,
    admission_year INTEGER,
    passing_year INTEGER,
    parent_name TEXT,
    school_id UUID,
    school TEXT,
    course_id UUID,
    course TEXT,
    branch_id UUID,
    branch TEXT,
    country_code TEXT,
    contact_no TEXT,
    personal_email TEXT,
    college_email TEXT,
    email TEXT,
    alumni_profile_link TEXT,
    alumni_screenshot_url TEXT,
    batch TEXT,
    section TEXT,
    semester INTEGER,
    cgpa DECIMAL(3,2),
    roll_number TEXT,
    enrollment_number TEXT,
    date_of_birth DATE,
    gender TEXT,
    category TEXT,
    blood_group TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pin_code TEXT,
    emergency_contact_name TEXT,
    emergency_contact_no TEXT,
    no_dues_status TEXT,
    certificate_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sd.registration_no,
        sd.student_name,
        sd.admission_year,
        sd.passing_year,
        sd.parent_name,
        sd.school_id,
        sd.school,
        sd.course_id,
        sd.course,
        sd.branch_id,
        sd.branch,
        sd.country_code,
        sd.contact_no,
        sd.personal_email,
        sd.college_email,
        sd.email,
        sd.alumni_profile_link,
        sd.alumni_screenshot_url,
        sd.batch,
        sd.section,
        sd.semester,
        sd.cgpa,
        sd.roll_number,
        sd.enrollment_number,
        sd.date_of_birth,
        sd.gender,
        sd.category,
        sd.blood_group,
        sd.address,
        sd.city,
        sd.state,
        sd.pin_code,
        sd.emergency_contact_name,
        sd.emergency_contact_no,
        sd.no_dues_status,
        sd.certificate_url
    FROM public.student_data sd
    WHERE LOWER(sd.registration_no) = LOWER(reg_no_param)
    AND sd.status = 'active'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_student_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_student_data_update ON public.student_data;
CREATE TRIGGER on_student_data_update
    BEFORE UPDATE ON public.student_data
    FOR EACH ROW EXECUTE FUNCTION public.update_student_data_timestamp();

-- Function to process bulk Excel data (High Performance)
DROP FUNCTION IF EXISTS public.bulk_map_excel_to_student_data(JSONB);
CREATE OR REPLACE FUNCTION public.bulk_map_excel_to_student_data(
    student_records JSONB
)
RETURNS TABLE (
    success_count INTEGER,
    error_count INTEGER
) AS $$
DECLARE
    rec JSONB;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(student_records)
    LOOP
        BEGIN
            PERFORM public.map_excel_to_student_data(
                (rec->>'registration_no'),
                (rec->>'student_name'),
                (rec->>'school'),
                (rec->>'course'),
                (rec->>'branch'),
                (rec->>'admission_year'),
                (rec->>'passing_year'),
                (rec->>'parent_name'),
                (rec->>'country_code'),
                (rec->>'contact_no'),
                (rec->>'personal_email'),
                (rec->>'college_email'),
                (rec->>'alumni_profile_link'),
                (rec->>'alumni_screenshot_url'),
                (rec->>'batch'),
                (rec->>'section'),
                (rec->>'semester'),
                (rec->>'cgpa'),
                (rec->>'backlogs'),
                (rec->>'roll_number'),
                (rec->>'enrollment_number'),
                (rec->>'date_of_birth'),
                (rec->>'gender'),
                (rec->>'category'),
                (rec->>'blood_group'),
                (rec->>'address'),
                (rec->>'city'),
                (rec->>'state'),
                (rec->>'pin_code'),
                (rec->>'emergency_contact_name'),
                (rec->>'emergency_contact_no')
            );
            v_success_count := v_success_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE NOTICE 'Error importing record %: %', rec->>'registration_no', SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_success_count, v_error_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE public.student_data IS 'Master student database for auto-fetch functionality with 29,000+ student records';
COMMENT ON COLUMN public.student_data.registration_no IS 'Unique registration number (primary search key)';
COMMENT ON COLUMN public.student_data.status IS 'Student status: active, inactive, graduated, transferred';
COMMENT ON COLUMN public.student_data.data_source IS 'Source of data: manual, import, ERP system';
