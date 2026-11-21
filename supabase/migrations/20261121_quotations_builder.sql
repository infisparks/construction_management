-- ============================================================
-- Quotation Builder Migration
-- Stores Word-like letterhead quotations, HTML content, margins,
-- client details, quotation amounts, and creator information.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT NOT NULL,
  title TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  client_address TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  project_name TEXT,
  quotation_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT DEFAULT 'draft',
  total_amount NUMERIC DEFAULT 0,
  content_html TEXT NOT NULL DEFAULT '',
  letterhead_enabled BOOLEAN DEFAULT true,
  letterhead_image_url TEXT DEFAULT '/letterhead.png',
  margin_top INTEGER DEFAULT 150,
  margin_bottom INTEGER DEFAULT 110,
  margin_left INTEGER DEFAULT 48,
  margin_right INTEGER DEFAULT 48,
  created_by_email TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated or anon users to read active quotations
DROP POLICY IF EXISTS "Allow select quotations" ON public.quotations;
CREATE POLICY "Allow select quotations" ON public.quotations
  FOR SELECT USING (is_deleted = false);

-- Allow insert
DROP POLICY IF EXISTS "Allow insert quotations" ON public.quotations;
CREATE POLICY "Allow insert quotations" ON public.quotations
  FOR INSERT WITH CHECK (true);

-- Allow update
DROP POLICY IF EXISTS "Allow update quotations" ON public.quotations;
CREATE POLICY "Allow update quotations" ON public.quotations
  FOR UPDATE USING (true) WITH CHECK (true);

-- Allow soft delete
DROP POLICY IF EXISTS "Allow delete quotations" ON public.quotations;
CREATE POLICY "Allow delete quotations" ON public.quotations
  FOR DELETE USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotations_project_id ON public.quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON public.quotations(created_by_email);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON public.quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
