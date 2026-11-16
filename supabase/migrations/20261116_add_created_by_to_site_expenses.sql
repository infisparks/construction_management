-- ==============================================================================
-- Migration: Set default for enterdby column to auth.uid()
-- ==============================================================================

-- Change the default of enterdby to auth.uid() so Supabase automatically sets the creator's UID
ALTER TABLE public.site_expenses
ALTER COLUMN enterdby SET DEFAULT auth.uid();
