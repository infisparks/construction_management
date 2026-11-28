-- ============================================================================
-- Safe & Non-Destructive Migration: Add GST & TDS columns to site_expenses
-- Existing rows are preserved and default to 0.
-- ============================================================================

ALTER TABLE public.site_expenses
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsn_sac_code TEXT;
