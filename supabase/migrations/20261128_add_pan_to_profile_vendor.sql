-- Safely add PAN Number column to public.profile_vendor without affecting existing data
ALTER TABLE public.profile_vendor
  ADD COLUMN IF NOT EXISTS pan TEXT;
