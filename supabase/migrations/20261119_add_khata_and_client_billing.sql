-- ============================================================
-- Migration: Add Party Khata Payments & Client Billing System
-- Tables:
--   1. public.client_invoices (Money Inflow / Client Milestone Bills)
--   2. public.client_receipts (Money Inward / Client Payments Received)
--   3. public.vendor_payments (Direct Vendor / Contractor Khata Payments)
-- ============================================================

-- 1. Client Invoices Table
CREATE TABLE IF NOT EXISTS public.client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no SERIAL NOT NULL,
  invoice_no TEXT NOT NULL UNIQUE,
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
  created_by TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Client Receipts Table (Money Inflow Received)
CREATE TABLE IF NOT EXISTS public.client_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no SERIAL NOT NULL,
  receipt_no TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_invoice_id UUID REFERENCES public.client_invoices(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference_no TEXT,
  bank_name TEXT,
  notes TEXT,
  receipt_url TEXT,
  created_by TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vendor Payments Table (Direct Payments to Vendors for Khata Reconciliation)
CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no SERIAL NOT NULL,
  voucher_no TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.profile_vendor(id) ON DELETE SET NULL,
  vendor_name TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference_no TEXT,
  bank_name TEXT,
  notes TEXT,
  receipt_url TEXT,
  created_by TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and permissive policies
ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- client_invoices policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_invoices' AND policyname = 'Allow all access to client_invoices') THEN
    CREATE POLICY "Allow all access to client_invoices" ON public.client_invoices FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- client_receipts policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_receipts' AND policyname = 'Allow all access to client_receipts') THEN
    CREATE POLICY "Allow all access to client_receipts" ON public.client_receipts FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- vendor_payments policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_payments' AND policyname = 'Allow all access to vendor_payments') THEN
    CREATE POLICY "Allow all access to vendor_payments" ON public.vendor_payments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
