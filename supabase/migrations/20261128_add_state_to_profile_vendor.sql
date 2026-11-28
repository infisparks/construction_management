-- Safely add State column to public.profile_vendor without affecting existing data
ALTER TABLE public.profile_vendor
  ADD COLUMN IF NOT EXISTS state TEXT;
