-- Add multi-user document approvals JSONB column to public.project_files
-- Safe for all existing documents (defaults to empty array '[]'::jsonb)

ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS approvals JSONB NOT NULL DEFAULT '[]'::jsonb;
