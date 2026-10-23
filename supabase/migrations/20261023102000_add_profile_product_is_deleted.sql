-- Add is_deleted column to profile_product and profile_vendor if not exists
ALTER TABLE IF EXISTS public.profile_product 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.profile_vendor 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profile_product_is_deleted ON public.profile_product(is_deleted);
CREATE INDEX IF NOT EXISTS idx_profile_vendor_is_deleted ON public.profile_vendor(is_deleted);
