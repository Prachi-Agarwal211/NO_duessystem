-- ============================================================================
-- DATA RECONCILIATION SCRIPT
-- ============================================================================
-- This script ensures all text-based schools/courses/branches in student_data
-- are correctly mapped to their corresponding IDs in config tables.

DO $$
DECLARE
    r RECORD;
    v_school_id UUID;
    v_course_id UUID;
    v_branch_id UUID;
BEGIN
    -- 1. Populate Schools
    FOR r IN SELECT DISTINCT school FROM student_data WHERE school IS NOT NULL AND school != '' LOOP
        SELECT id INTO v_school_id FROM config_schools WHERE LOWER(name) = LOWER(r.school);
        IF v_school_id IS NULL THEN
            INSERT INTO config_schools (name) VALUES (r.school) RETURNING id INTO v_school_id;
        END IF;
        UPDATE student_data SET school_id = v_school_id WHERE school = r.school;
    END LOOP;

    -- 2. Populate Courses
    FOR r IN SELECT DISTINCT school_id, course FROM student_data WHERE course IS NOT NULL AND course != '' AND school_id IS NOT NULL LOOP
        SELECT id INTO v_course_id FROM config_courses WHERE school_id = r.school_id AND LOWER(name) = LOWER(r.course);
        IF v_course_id IS NULL THEN
            INSERT INTO config_courses (school_id, name) VALUES (r.school_id, r.course) RETURNING id INTO v_course_id;
        END IF;
        UPDATE student_data SET course_id = v_course_id WHERE school_id = r.school_id AND course = r.course;
    END LOOP;

    -- 3. Populate Branches
    FOR r IN SELECT DISTINCT course_id, branch FROM student_data WHERE branch IS NOT NULL AND branch != '' AND course_id IS NOT NULL LOOP
        SELECT id INTO v_branch_id FROM config_branches WHERE course_id = r.course_id AND LOWER(name) = LOWER(r.branch);
        IF v_branch_id IS NULL THEN
            INSERT INTO config_branches (course_id, name) VALUES (r.course_id, r.branch) RETURNING id INTO v_branch_id;
        END IF;
        UPDATE student_data SET branch_id = v_branch_id WHERE course_id = r.course_id AND branch = r.branch;
    END LOOP;
END $$;
