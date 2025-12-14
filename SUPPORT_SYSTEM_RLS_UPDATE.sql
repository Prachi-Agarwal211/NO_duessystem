-- ============================================
-- SUPPORT SYSTEM RLS POLICY UPDATE
-- ============================================
-- This ensures students only see student tickets and departments only see department tickets
-- While admins can see all tickets

-- Drop existing RLS policy that allows users to view their own tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;

-- Create separate policies for students and department staff
-- Students can only view their own student tickets
CREATE POLICY "Students can view their own student tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    requester_type = 'student' 
    AND email = auth.jwt()->>'email'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );

-- Department staff can only view their own department tickets
CREATE POLICY "Department staff can view their own department tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    requester_type = 'department' 
    AND email = auth.jwt()->>'email'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('staff', 'hod')
    )
  );

-- The existing "Admins can view all tickets" policy remains as is
-- No changes needed for admin access

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Support System RLS Policies Updated Successfully!';
  RAISE NOTICE '👨‍🎓 Students can only see their own student tickets';
  RAISE NOTICE '👨‍💼 Department staff can only see their own department tickets';
  RAISE NOTICE '👨‍💻 Admins can still see all tickets';
END $$;