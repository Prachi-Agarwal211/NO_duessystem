-- ============================================
-- SUPPORT TICKETS SYSTEM SCHEMA
-- ============================================
-- This creates a complete support ticket system for JECRC No Dues
-- Students and departments can submit support requests
-- Admin can view and manage all support tickets

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,
  
  -- Requester Information
  email TEXT NOT NULL,
  roll_number TEXT, -- NULL for department staff, required for students
  requester_type TEXT NOT NULL CHECK (requester_type IN ('student', 'department')),
  
  -- Ticket Details
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  
  -- Indexing for performance
  CONSTRAINT valid_student_roll CHECK (
    (requester_type = 'student' AND roll_number IS NOT NULL) OR
    (requester_type = 'department' AND roll_number IS NULL)
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON public.support_tickets(email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_roll_number ON public.support_tickets(roll_number) WHERE roll_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester_type ON public.support_tickets(requester_type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON public.support_tickets(ticket_number);

-- Function to generate unique ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  new_ticket_number TEXT;
  ticket_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate ticket number: SUP-YYYYMMDD-XXXXX
    new_ticket_number := 'SUP-' || 
                        TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
    
    -- Check if ticket number already exists
    SELECT EXISTS(
      SELECT 1 FROM public.support_tickets WHERE ticket_number = new_ticket_number
    ) INTO ticket_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT ticket_exists;
  END LOOP;
  
  RETURN new_ticket_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_support_ticket_timestamp
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_timestamp();

-- Enable Row Level Security
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Anyone can insert support tickets (public submission)
CREATE POLICY "Anyone can submit support tickets"
  ON public.support_tickets
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 2. Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    email = auth.jwt()->>'email'
  );

-- 3. Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. Admins can update all tickets
CREATE POLICY "Admins can update tickets"
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Admins can delete tickets
CREATE POLICY "Admins can delete tickets"
  ON public.support_tickets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON public.support_tickets TO anon;
GRANT ALL ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

-- Create a view for admin statistics
CREATE OR REPLACE VIEW public.support_tickets_stats AS
SELECT
  COUNT(*) as total_tickets,
  COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
  COUNT(*) FILTER (WHERE status = 'resolved') as resolved_tickets,
  COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
  COUNT(*) FILTER (WHERE requester_type = 'student') as student_tickets,
  COUNT(*) FILTER (WHERE requester_type = 'department') as department_tickets,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_tickets,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_tickets,
  AVG(
    CASE 
      WHEN resolved_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 
    END
  ) as avg_resolution_time_hours
FROM public.support_tickets;

-- Grant view access
GRANT SELECT ON public.support_tickets_stats TO authenticated;
GRANT SELECT ON public.support_tickets_stats TO service_role;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Support Tickets System Schema Created Successfully!';
  RAISE NOTICE '📊 Table: support_tickets';
  RAISE NOTICE '🎫 Auto-generated ticket numbers: SUP-YYYYMMDD-XXXXX';
  RAISE NOTICE '🔐 RLS Policies: Configured for public submission, user view, admin management';
  RAISE NOTICE '📈 Statistics View: support_tickets_stats';
END $$;