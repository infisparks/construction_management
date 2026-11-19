-- ============================================================
-- Clean Relational Client Billing & Drop Party Khata
-- No DO $$ blocks - Guaranteed safe to run in Supabase SQL Editor
-- ============================================================

-- 1. Drop old vendor_payments (Party Khata removed)
DROP TABLE IF EXISTS public.vendor_payments CASCADE;

-- 2. Create Client Profile Table
CREATE TABLE IF NOT EXISTS public.profile_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no SERIAL NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,
  pan TEXT,
  total_deal_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  enterdby UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already present
ALTER TABLE public.profile_clients 
ADD COLUMN IF NOT EXISTS enterdby UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
ADD COLUMN IF NOT EXISTS total_deal_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create Client Invoices Table (Milestone Bills)
CREATE TABLE IF NOT EXISTS public.client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no SERIAL NOT NULL,
  invoice_no TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.profile_clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_address TEXT,
  client_gstin TEXT,
  client_phone TEXT,
  client_email TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  milestone_title TEXT NOT NULL,
  scope_description TEXT,
  taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  gst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  amount_received NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  balance_due NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  enterdby UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.client_invoices 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.profile_clients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS enterdby UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Create Client Receipts Table (Money Inward)
CREATE TABLE IF NOT EXISTS public.client_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no SERIAL NOT NULL,
  receipt_no TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.profile_clients(id) ON DELETE CASCADE,
  client_invoice_id UUID REFERENCES public.client_invoices(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference_no TEXT,
  bank_name TEXT,
  notes TEXT,
  receipt_url TEXT,
  enterdby UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.client_receipts 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.profile_clients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS enterdby UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profile_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_receipts ENABLE ROW LEVEL SECURITY;

-- 6. Clean Direct Policies (No DO $$ block needed)
DROP POLICY IF EXISTS "Allow all access to profile_clients" ON public.profile_clients;
CREATE POLICY "Allow all access to profile_clients" ON public.profile_clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to client_invoices" ON public.client_invoices;
CREATE POLICY "Allow all access to client_invoices" ON public.client_invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to client_receipts" ON public.client_receipts;
CREATE POLICY "Allow all access to client_receipts" ON public.client_receipts FOR ALL USING (true) WITH CHECK (true);
