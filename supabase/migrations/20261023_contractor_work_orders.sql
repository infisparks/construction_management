-- ==============================================================================
-- Migration: Contractor Work Orders, Revisions (Extra Work) & Payment Disbursals
-- Description: Tracks base contract amount, variation orders / extra work with notes
--              and history, payouts/advances, and automatically updates balances.
-- ==============================================================================

-- 1. Contractor Work Orders Table
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
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'draft', 'in_progress', 'completed', 'on_hold', 'cancelled'
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

-- 2. Work Order Revisions Table (Extra Work & Variations History)
CREATE TABLE IF NOT EXISTS public.work_order_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES public.contractor_work_orders(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    revision_type TEXT NOT NULL DEFAULT 'extra_work', -- 'initial_agreement', 'extra_work', 'scope_addition', 'rate_revision', 'deduction'
    previous_amount NUMERIC(14, 2) NOT NULL,
    additional_amount NUMERIC(14, 2) NOT NULL,
    new_total_amount NUMERIC(14, 2) NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    added_by TEXT,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Work Order Payments Table (Disbursements & Advances History)
CREATE TABLE IF NOT EXISTS public.work_order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES public.contractor_work_orders(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    payment_voucher_no TEXT NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_paid NUMERIC(14, 2) NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'upi', 'bank_transfer', 'cheque', 'rtgs_neft'
    reference_number TEXT,
    paid_to TEXT NOT NULL,
    paid_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for high-performance filtering by date and project
CREATE INDEX IF NOT EXISTS idx_wo_project ON public.contractor_work_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_wo_start_date ON public.contractor_work_orders(start_date);
CREATE INDEX IF NOT EXISTS idx_wo_revisions_date ON public.work_order_revisions(revision_date);
CREATE INDEX IF NOT EXISTS idx_wo_payments_date ON public.work_order_payments(payment_date);

-- Enable RLS
ALTER TABLE public.contractor_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_payments ENABLE ROW LEVEL SECURITY;

-- Allow policies
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

-- Automated Recalculation Trigger Function
CREATE OR REPLACE FUNCTION public.sync_work_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    target_wo_id UUID;
    v_initial NUMERIC(14, 2);
    v_extra NUMERIC(14, 2);
    v_paid NUMERIC(14, 2);
    v_revised NUMERIC(14, 2);
BEGIN
    target_wo_id := COALESCE(NEW.work_order_id, OLD.work_order_id);

    SELECT initial_amount INTO v_initial 
    FROM public.contractor_work_orders 
    WHERE id = target_wo_id;

    IF v_initial IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(additional_amount), 0.00) INTO v_extra
    FROM public.work_order_revisions
    WHERE work_order_id = target_wo_id;

    SELECT COALESCE(SUM(amount_paid), 0.00) INTO v_paid
    FROM public.work_order_payments
    WHERE work_order_id = target_wo_id;

    v_revised := v_initial + v_extra;

    UPDATE public.contractor_work_orders
    SET extra_amount = v_extra,
        total_revised_amount = v_revised,
        total_paid = v_paid,
        balance_remaining = (v_revised - v_paid),
        updated_at = now()
    WHERE id = target_wo_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_revision_totals
AFTER INSERT OR UPDATE OR DELETE ON public.work_order_revisions
FOR EACH ROW EXECUTE FUNCTION public.sync_work_order_totals();

CREATE OR REPLACE TRIGGER trg_sync_payment_totals
AFTER INSERT OR UPDATE OR DELETE ON public.work_order_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_work_order_totals();
