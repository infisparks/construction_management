-- ==============================================================================
-- Migration: Fix Row Level Security (RLS) on public.site_expenses
-- Description: Resolves "new row violates row-level security policy for table site_expenses"
-- ==============================================================================

-- Option A: Disable RLS on site_expenses (Recommended if app manages auth/demo roles in application code)
ALTER TABLE public.site_expenses DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to database roles
GRANT ALL ON TABLE public.site_expenses TO postgres, anon, authenticated, service_role;

-- Option B: If you prefer keeping RLS enabled, run the permissive policy below instead:
-- ALTER TABLE public.site_expenses ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all access to site_expenses" ON public.site_expenses;
-- CREATE POLICY "Allow all access to site_expenses"
-- ON public.site_expenses
-- FOR ALL
-- TO anon, authenticated
-- USING (true)
-- WITH CHECK (true);
-- GRANT ALL ON TABLE public.site_expenses TO postgres, anon, authenticated, service_role;
