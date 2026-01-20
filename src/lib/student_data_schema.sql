-- ============================================================================
-- STUDENT_DATA TABLE - For 29,000+ students auto-fetch functionality
-- ============================================================================

-- Drop table if exists (for development)
DROP TABLE IF EXISTS public.student_data CASCADE;

-- Create student_data table
CREATE TABLE public.student_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_no TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    admission_year INTEGER,
    passing_year INTEGER,
    parent_name TEXT,
    school TEXT,
    course TEXT,
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
    
    -- Status and metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred', 'dropped_out')),
    data_source TEXT DEFAULT 'manual' CHECK (data_source IN ('manual', 'import', 'erp', 'excel')),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance (critical for 29,000+ records)
CREATE INDEX idx_student_data_regno ON public.student_data(registration_no);
CREATE INDEX idx_student_data_name ON public.student_data(student_name);
CREATE INDEX idx_student_data_school ON public.student_data(school);
CREATE INDEX idx_student_data_course ON public.student_data(course);
CREATE INDEX idx_student_data_branch ON public.student_data(branch);
CREATE INDEX idx_student_data_status ON public.student_data(status);
CREATE INDEX idx_student_data_admission_year ON public.student_data(admission_year);

-- Enable Row Level Security
ALTER TABLE public.student_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read student_data for auto-fetch" ON public.student_data FOR SELECT USING (true);
CREATE POLICY "Admin manage student_data" ON public.student_data FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Function to search students by registration number or name
CREATE OR REPLACE FUNCTION public.search_student_data(search_term TEXT)
RETURNS TABLE (
    registration_no TEXT,
    student_name TEXT,
    admission_year INTEGER,
    passing_year INTEGER,
    parent_name TEXT,
    school TEXT,
    course TEXT,
    branch TEXT,
    contact_no TEXT,
    personal_email TEXT,
    college_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sd.registration_no,
        sd.student_name,
        sd.admission_year,
        sd.passing_year,
        sd.parent_name,
        sd.school,
        sd.course,
        sd.branch,
        sd.contact_no,
        sd.personal_email,
        sd.college_email
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
    school_id UUID;
    course_id UUID;
    branch_id UUID;
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
    
    -- Find matching school
    SELECT id INTO school_id 
    FROM config_schools 
    WHERE is_active = true 
    AND (
        LOWER(name) = normalized_school OR
        LOWER(name) LIKE '%' || normalized_school || '%' OR
        normalized_school LIKE '%' || LOWER(name) || '%'
    )
    LIMIT 1;
    
    -- Find matching course (only if school found)
    IF school_id IS NOT NULL THEN
        SELECT id INTO course_id
        FROM config_courses
        WHERE is_active = true 
        AND school_id = school_id
        AND (
            LOWER(name) = normalized_course OR
            LOWER(name) LIKE '%' || normalized_course || '%' OR
            normalized_course LIKE '%' || LOWER(name) || '%'
        )
        LIMIT 1;
    END IF;
    
    -- Find matching branch (only if course found)
    IF course_id IS NOT NULL THEN
        SELECT id INTO branch_id
        FROM config_branches
        WHERE is_active = true 
        AND course_id = course_id
        AND (
            LOWER(name) = normalized_branch OR
            LOWER(name) LIKE '%' || normalized_branch || '%' OR
            normalized_branch LIKE '%' || LOWER(name) || '%'
        )
        LIMIT 1;
    END IF;
    
    -- Insert student data
    INSERT INTO public.student_data (
        registration_no,
        student_name,
        admission_year,
        passing_year,
        parent_name,
        school,
        course,
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
        status
    ) VALUES (
        COALESCE(TRIM(excel_registration_no), ''),
        COALESCE(TRIM(excel_student_name), ''),
        CASE WHEN excel_admission_year ~ '^[0-9]{4}$' THEN CAST(excel_admission_year AS INTEGER) ELSE NULL END,
        CASE WHEN excel_passing_year ~ '^[0-9]{4}$' THEN CAST(excel_passing_year AS INTEGER) ELSE NULL END,
        COALESCE(TRIM(excel_parent_name), ''),
        COALESCE((SELECT name FROM config_schools WHERE id = school_id), TRIM(excel_school)),
        COALESCE((SELECT name FROM config_courses WHERE id = course_id), TRIM(excel_course)),
        COALESCE((SELECT name FROM config_branches WHERE id = branch_id), TRIM(excel_branch)),
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
        'active'
    )
    RETURNING id INTO student_id;
    
    RETURN student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get student by registration number (exact match)
CREATE OR REPLACE FUNCTION public.get_student_by_regno(reg_no_param TEXT)
RETURNS TABLE (
    registration_no TEXT,
    student_name TEXT,
    admission_year INTEGER,
    passing_year INTEGER,
    parent_name TEXT,
    school TEXT,
    course TEXT,
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
    emergency_contact_no TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sd.registration_no,
        sd.student_name,
        sd.admission_year,
        sd.passing_year,
        sd.parent_name,
        sd.school,
        sd.course,
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
        sd.emergency_contact_no
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

CREATE TRIGGER on_student_data_update
    BEFORE UPDATE ON public.student_data
    FOR EACH ROW EXECUTE FUNCTION public.update_student_data_timestamp();

-- Comments for documentation
COMMENT ON TABLE public.student_data IS 'Master student database for auto-fetch functionality with 29,000+ student records';
COMMENT ON COLUMN public.student_data.registration_no IS 'Unique registration number (primary search key)';
COMMENT ON COLUMN public.student_data.status IS 'Student status: active, inactive, graduated, transferred';
COMMENT ON COLUMN public.student_data.data_source IS 'Source of data: manual, import, ERP system';
