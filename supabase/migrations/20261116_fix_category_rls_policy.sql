-- ==============================================================================
-- Migration: Fix Row Level Security (RLS) on public.category
-- Description: Allows saving and updating dynamic dropdown categories
-- ==============================================================================

-- Option A: Disable RLS on reference table `category` (Recommended for public reference dropdowns)
ALTER TABLE public.category DISABLE ROW LEVEL SECURITY;

-- Grant full table permissions to application roles
GRANT ALL ON TABLE public.category TO postgres, anon, authenticated, service_role;

-- Option B (if RLS must remain enabled): Policy for anon and authenticated users
-- ALTER TABLE public.category ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all access to category" ON public.category;
-- CREATE POLICY "Allow all access to category"
-- ON public.category
-- FOR ALL
-- TO anon, authenticated
-- USING (true)
-- WITH CHECK (true);
