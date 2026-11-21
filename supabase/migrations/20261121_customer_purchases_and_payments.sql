-- ============================================================
-- Supabase Storage Buckets & Customer Purchases Migration:
-- 1. Storage Buckets (project-documents, expense-documents)
-- 2. Customer Purchases (1 BHK, 2 BHK, Room, Commercial, etc.)
-- 3. Customer Payments (Cash, Online, UPI, Cards, NetBanking)
-- 4. Dynamic Categories (Purchase Types, Payment Modes)
-- ============================================================

-- ============================================================
-- Part 1: Storage Buckets Migration (Public Access)
-- ============================================================

-- 1. Create project-documents bucket (50MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  true,
  52428800,
  NULL
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create expense-documents bucket (50MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-documents',
  'expense-documents',
  true,
  52428800,
  NULL
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage Policies for project-documents
DROP POLICY IF EXISTS "Public View project-documents" ON storage.objects;
CREATE POLICY "Public View project-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "Public Upload project-documents" ON storage.objects;
CREATE POLICY "Public Upload project-documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "Public Update project-documents" ON storage.objects;
CREATE POLICY "Public Update project-documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "Public Delete project-documents" ON storage.objects;
CREATE POLICY "Public Delete project-documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-documents');

-- 4. Storage Policies for expense-documents
DROP POLICY IF EXISTS "Public View expense-documents" ON storage.objects;
CREATE POLICY "Public View expense-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-documents');

DROP POLICY IF EXISTS "Public Upload expense-documents" ON storage.objects;
CREATE POLICY "Public Upload expense-documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'expense-documents');

DROP POLICY IF EXISTS "Public Update expense-documents" ON storage.objects;
CREATE POLICY "Public Update expense-documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'expense-documents');

DROP POLICY IF EXISTS "Public Delete expense-documents" ON storage.objects;
CREATE POLICY "Public Delete expense-documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'expense-documents');


-- ============================================================
-- Part 2: Dynamic Category Table (for extensible categories)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.category (
  name TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default Purchase Categories (Room, 1 BHK, 2 BHK, etc.)
INSERT INTO public.category (name, value)
VALUES (
  'customer_purchase_types',
  '["Room", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "Commercial Shop", "Office Space", "Plot / Land", "Penthouse", "Studio Apartment", "Other"]'::jsonb
)
ON CONFLICT (name) DO UPDATE 
SET value = '["Room", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "Commercial Shop", "Office Space", "Plot / Land", "Penthouse", "Studio Apartment", "Other"]'::jsonb;

-- Seed default Payment Modes (Cash, Online, UPI, Credit Card, NetBanking, Cheque, RTGS)
INSERT INTO public.category (name, value)
VALUES (
  'customer_payment_modes',
  '["Cash", "Online", "UPI / GPay", "Credit Card", "Debit Card", "Net Banking", "Cheque", "RTGS / NEFT"]'::jsonb
)
ON CONFLICT (name) DO UPDATE 
SET value = '["Cash", "Online", "UPI / GPay", "Credit Card", "Debit Card", "Net Banking", "Cheque", "RTGS / NEFT"]'::jsonb;


-- ============================================================
-- Part 3: Table 1 - customer_purchases (Customer Deals & Bookings)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  deal_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  purchase_type TEXT NOT NULL DEFAULT 'Room',
  unit_number TEXT,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_purchases_project_id ON public.customer_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_purchases_deal_no ON public.customer_purchases(deal_number);
CREATE INDEX IF NOT EXISTS idx_customer_purchases_is_deleted ON public.customer_purchases(is_deleted);


-- ============================================================
-- Part 4: Table 2 - customer_payments (Money Collected / Inward Slips)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.customer_purchases(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  receipt_voucher_no TEXT NOT NULL,
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  reference_no TEXT,
  received_by TEXT,
  notes TEXT,
  receipt_url TEXT,
  created_by_user_id UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_payments_purchase_id ON public.customer_payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_project_id ON public.customer_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_receipt_no ON public.customer_payments(receipt_voucher_no);
CREATE INDEX IF NOT EXISTS idx_customer_payments_is_deleted ON public.customer_payments(is_deleted);


-- ============================================================
-- Part 5: Row Level Security (RLS) & Access Policies
-- ============================================================

ALTER TABLE public.category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to category" ON public.category;
CREATE POLICY "Allow all access to category" ON public.category FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to customer_purchases" ON public.customer_purchases;
CREATE POLICY "Allow all access to customer_purchases" ON public.customer_purchases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to customer_payments" ON public.customer_payments;
CREATE POLICY "Allow all access to customer_payments" ON public.customer_payments FOR ALL USING (true) WITH CHECK (true);

-- Optional: If created_by_user_id was previously UUID and you want to allow email/text strings:
-- ALTER TABLE public.customer_purchases ALTER COLUMN created_by_user_id TYPE TEXT USING created_by_user_id::text;
-- ALTER TABLE public.customer_payments ALTER COLUMN created_by_user_id TYPE TEXT USING created_by_user_id::text;
