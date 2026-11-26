-- ============================================================================
-- Partial Payment Support for site_expenses (Safe & Non-Destructive)
-- Does NOT modify or disturb any existing rows.
-- ============================================================================

-- 1. Add partial payment & audit date columns safely
ALTER TABLE public.site_expenses
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS first_payment_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS settlement_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]'::jsonb;

-- 2. Safely update payment_status check constraint (if present) to allow 'partial'
DO $$
DECLARE
  c_name text;
BEGIN
  FOR c_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.site_expenses'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%payment_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.site_expenses DROP CONSTRAINT IF EXISTS %I', c_name);
  END LOOP;
END $$;

ALTER TABLE public.site_expenses
  ADD CONSTRAINT site_expenses_payment_status_check
  CHECK (payment_status IN ('paid', 'pending', 'partial', 'reimbursable'));

-- 3. Helpful index for partial/pending bills
CREATE INDEX IF NOT EXISTS idx_site_expenses_partial_pending
  ON public.site_expenses (payment_status, is_deleted)
  WHERE payment_status IN ('pending', 'partial', 'reimbursable');
