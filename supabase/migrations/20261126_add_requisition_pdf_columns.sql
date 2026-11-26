-- ============================================================================
-- Add PDF / Document columns to purchase_requisitions (Safe & Idempotent)
-- ============================================================================

ALTER TABLE public.purchase_requisitions
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;
