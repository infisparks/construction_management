-- ============================================================================
-- Production BOQ & Budget Planning Columns on profile_product + Fast Indexes
-- Safe & Non-Destructive: all existing rows preserved with default 0 / '{}'.
-- Flexible `boq_meta` JSONB allows future extensions (Cost/SFT, Area, Site targets).
-- ============================================================================

ALTER TABLE public.profile_product
  ADD COLUMN IF NOT EXISTS boq_cost_code TEXT,
  ADD COLUMN IF NOT EXISTS boq_section TEXT,
  ADD COLUMN IF NOT EXISTS boq_planned_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boq_planned_rate NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boq_planned_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boq_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Fast indexes for BOQ filtering & Director Planned vs Actual comparisons
CREATE INDEX IF NOT EXISTS idx_profile_product_boq_cost_code
  ON public.profile_product (boq_cost_code)
  WHERE is_deleted = false AND boq_cost_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profile_product_boq_section
  ON public.profile_product (boq_section)
  WHERE is_deleted = false AND boq_section IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inv_tx_product_type_date
  ON public.inventory_transactions (product_id, type, transaction_date DESC)
  WHERE is_deleted = false;
