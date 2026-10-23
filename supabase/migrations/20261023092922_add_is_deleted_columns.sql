-- ==============================================================================
-- Migration: Add is_deleted columns & soft-delete support for Work Orders & Plan Tasks
-- ==============================================================================

-- 1. Add is_deleted to plan_tasks
ALTER TABLE IF EXISTS public.plan_tasks 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- 2. Ensure contractor_work_orders table exists and has is_deleted
CREATE TABLE IF NOT EXISTS public.contractor_work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    work_order_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    trade_category TEXT NOT NULL DEFAULT 'General Construction',
    scope_description TEXT,
    vendor_name TEXT NOT NULL,
    vendor_phone TEXT,
    vendor_address TEXT,
    vendor_gstin TEXT,
    vendor_pan TEXT,
    vendor_bank_upi TEXT,
    start_date DATE DEFAULT CURRENT_DATE,
    expected_completion_date DATE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    initial_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    extra_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_revised_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance_remaining NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE IF EXISTS public.contractor_work_orders 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- 3. Ensure work_order_revisions table exists and has is_deleted
CREATE TABLE IF NOT EXISTS public.work_order_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES public.contractor_work_orders(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    revision_type TEXT NOT NULL DEFAULT 'extra_work',
    previous_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    additional_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    new_total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    reason TEXT NOT NULL DEFAULT '',
    notes TEXT,
    added_by TEXT,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE IF EXISTS public.work_order_revisions 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- 4. Ensure work_order_payments table exists and has is_deleted
CREATE TABLE IF NOT EXISTS public.work_order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES public.contractor_work_orders(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    payment_voucher_no TEXT NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_mode TEXT NOT NULL DEFAULT 'cash',
    reference_number TEXT,
    paid_to TEXT NOT NULL,
    paid_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE IF EXISTS public.work_order_payments 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plan_tasks_is_deleted ON public.plan_tasks(is_deleted);
CREATE INDEX IF NOT EXISTS idx_wo_is_deleted ON public.contractor_work_orders(is_deleted);
CREATE INDEX IF NOT EXISTS idx_wo_rev_is_deleted ON public.work_order_revisions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_wo_pay_is_deleted ON public.work_order_payments(is_deleted);

-- Row Level Security
ALTER TABLE public.contractor_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contractor_work_orders' AND policyname = 'Allow all access to contractor_work_orders') THEN
        CREATE POLICY "Allow all access to contractor_work_orders" ON public.contractor_work_orders FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_order_revisions' AND policyname = 'Allow all access to work_order_revisions') THEN
        CREATE POLICY "Allow all access to work_order_revisions" ON public.work_order_revisions FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_order_payments' AND policyname = 'Allow all access to work_order_payments') THEN
        CREATE POLICY "Allow all access to work_order_payments" ON public.work_order_payments FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
