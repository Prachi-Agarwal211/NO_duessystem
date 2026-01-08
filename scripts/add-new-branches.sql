-- ========================================================================
-- ADD NEW BRANCHES TO EXISTING COURSES
-- ========================================================================
-- This script adds new branches to B.Tech, MCA, BCA, BBA, and MBA courses
-- New branches will be positioned at the top of their respective course lists
-- All existing branches will be preserved with updated display orders
-- ========================================================================

-- Safety check: Verify course IDs exist before making changes
DO $$
DECLARE
  v_btech_exists BOOLEAN;
  v_mca_exists BOOLEAN;
  v_bca_exists BOOLEAN;
  v_bba_exists BOOLEAN;
  v_mba_exists BOOLEAN;
BEGIN
  -- Check if all target courses exist
  SELECT EXISTS(SELECT 1 FROM config_courses WHERE id = '4070b71a-6a9a-4436-9452-f9ed8e97e1f1') INTO v_btech_exists;
  SELECT EXISTS(SELECT 1 FROM config_courses WHERE id = '9fd733a2-7258-45ef-a725-3854b71dc972') INTO v_mca_exists;
  SELECT EXISTS(SELECT 1 FROM config_courses WHERE id = 'afe542c8-a3e9-4dac-851f-9e583e8ae125') INTO v_bca_exists;
  SELECT EXISTS(SELECT 1 FROM config_courses WHERE id = 'cd5e3027-5077-4593-bb1c-0e6345291689') INTO v_bba_exists;
  SELECT EXISTS(SELECT 1 FROM config_courses WHERE id = 'fffc3234-e6e0-4466-891b-1acce82f143c') INTO v_mba_exists;

  IF NOT (v_btech_exists AND v_mca_exists AND v_bca_exists AND v_bba_exists AND v_mba_exists) THEN
    RAISE EXCEPTION 'One or more target courses do not exist. Aborting.';
  END IF;
END $$;

-- ============================================
-- B.TECH BRANCHES
-- Add 8 new branches at the top
-- ============================================

-- Step 1: Shift existing B.Tech branches down by 8 positions
UPDATE config_branches 
SET display_order = display_order + 8,
    updated_at = now()
WHERE course_id = '4070b71a-6a9a-4436-9452-f9ed8e97e1f1';

-- Step 2: Insert 8 new B.Tech branches at positions 1-8
INSERT INTO config_branches (course_id, name, display_order, is_active, created_at, updated_at)
VALUES 
  ('4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'CSE AI/ML Xebia', 1, true, now(), now()),
  ('4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'CSE AI/ML IBM', 2, true, now(), now()),
  ('4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'CSE AI/ML Samatrix', 3, true, now(), now()),
  ('4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'CSE Fullstack - Xebia', 4, true, now(), now()),
  ('4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'CSE Cloud Computing - Microsoft', 5, true, now(), now()),
  ('4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'CSE Cloud Computing - AWS', 6, true, now(), now()),
  ('4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'CSE Blockchain - upGrad', 7, true, now(), now()),
  ('4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'CSE Data Science Samatrix', 8, true, now(), now());

-- ============================================
-- MCA BRANCHES
-- Add 2 new branches at the top
-- ============================================

-- Step 1: Shift existing MCA branches down by 2 positions
UPDATE config_branches 
SET display_order = display_order + 2,
    updated_at = now()
WHERE course_id = '9fd733a2-7258-45ef-a725-3854b71dc972';

-- Step 2: Insert 2 new MCA branches at positions 1-2
INSERT INTO config_branches (course_id, name, display_order, is_active, created_at, updated_at)
VALUES 
  ('9fd733a2-7258-45ef-a725-3854b71dc972', 'MCA Sunstone', 1, true, now(), now()),
  ('9fd733a2-7258-45ef-a725-3854b71dc972', 'MCA CollegeDekho', 2, true, now(), now());

-- ============================================
-- BCA BRANCHES
-- Add 2 new branches at the top
-- ============================================

-- Step 1: Shift existing BCA branches down by 2 positions
UPDATE config_branches 
SET display_order = display_order + 2,
    updated_at = now()
WHERE course_id = 'afe542c8-a3e9-4dac-851f-9e583e8ae125';

-- Step 2: Insert 2 new BCA branches at positions 1-2
INSERT INTO config_branches (course_id, name, display_order, is_active, created_at, updated_at)
VALUES 
  ('afe542c8-a3e9-4dac-851f-9e583e8ae125', 'BCA Sunstone', 1, true, now(), now()),
  ('afe542c8-a3e9-4dac-851f-9e583e8ae125', 'BCA CollegeDekho', 2, true, now(), now());

-- ============================================
-- BBA BRANCHES
-- Add 3 new branches at the top
-- ============================================

-- Step 1: Shift existing BBA branches down by 3 positions
UPDATE config_branches 
SET display_order = display_order + 3,
    updated_at = now()
WHERE course_id = 'cd5e3027-5077-4593-bb1c-0e6345291689';

-- Step 2: Insert 3 new BBA branches at positions 1-3
INSERT INTO config_branches (course_id, name, display_order, is_active, created_at, updated_at)
VALUES 
  ('cd5e3027-5077-4593-bb1c-0e6345291689', 'BBA - ISDC', 1, true, now(), now()),
  ('cd5e3027-5077-4593-bb1c-0e6345291689', 'BBA - Sunstone', 2, true, now(), now()),
  ('cd5e3027-5077-4593-bb1c-0e6345291689', 'BBA - CollegeDekho', 3, true, now(), now());

-- ============================================
-- MBA BRANCHES
-- Add 3 new branches at the top
-- ============================================

-- Step 1: Shift existing MBA branches down by 3 positions
UPDATE config_branches 
SET display_order = display_order + 3,
    updated_at = now()
WHERE course_id = 'fffc3234-e6e0-4466-891b-1acce82f143c';

-- Step 2: Insert 3 new MBA branches at positions 1-3
INSERT INTO config_branches (course_id, name, display_order, is_active, created_at, updated_at)
VALUES 
  ('fffc3234-e6e0-4466-891b-1acce82f143c', 'MBA - ISDC', 1, true, now(), now()),
  ('fffc3234-e6e0-4466-891b-1acce82f143c', 'MBA - CollegeDekho', 2, true, now(), now()),
  ('fffc3234-e6e0-4466-891b-1acce82f143c', 'MBA - Sunstone', 3, true, now(), now());

-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify the changes
-- ============================================

-- Count branches per course
SELECT 
  c.name as course_name,
  COUNT(b.id) as branch_count
FROM config_courses c
LEFT JOIN config_branches b ON b.course_id = c.id
WHERE c.id IN (
  '4070b71a-6a9a-4436-9452-f9ed8e97e1f1',
  '9fd733a2-7258-45ef-a725-3854b71dc972',
  'afe542c8-a3e9-4dac-851f-9e583e8ae125',
  'cd5e3027-5077-4593-bb1c-0e6345291689',
  'fffc3234-e6e0-4466-891b-1acce82f143c'
)
GROUP BY c.name
ORDER BY c.name;

-- View top 5 branches for each course
WITH course_branches AS (
  SELECT 
    c.name as course_name,
    b.name as branch_name,
    b.display_order,
    b.created_at
  FROM config_courses c
  JOIN config_branches b ON b.course_id = c.id
  WHERE c.id IN (
    '4070b71a-6a9a-4436-9452-f9ed8e97e1f1',
    '9fd733a2-7258-45ef-a725-3854b71dc972',
    'afe542c8-a3e9-4dac-851f-9e583e8ae125',
    'cd5e3027-5077-4593-bb1c-0e6345291689',
    'fffc3234-e6e0-4466-891b-1acce82f143c'
  )
  AND b.display_order <= 5
  ORDER BY c.name, b.display_order
)
SELECT * FROM course_branches;