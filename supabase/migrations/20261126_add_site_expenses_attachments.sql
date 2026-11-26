-- ==============================================================================
-- Safe Migration: Add multi-attachment JSONB column to public.site_expenses
-- Preserves all existing data and backfills existing receipt_url into attachments.
-- ==============================================================================

-- 1. Safely add attachments column (non-destructive)
ALTER TABLE IF EXISTS public.site_expenses
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Safely backfill existing single receipt_url rows into attachments array
-- (keeps receipt_url and receipt_file_name untouched for full backward compatibility)
UPDATE public.site_expenses
SET attachments = jsonb_build_array(
  jsonb_build_object(
    'url', receipt_url,
    'name', COALESCE(NULLIF(receipt_file_name, ''), 'Bill Attachment')
  )
)
WHERE receipt_url IS NOT NULL
  AND receipt_url <> ''
  AND (attachments IS NULL OR jsonb_array_length(attachments) = 0);
