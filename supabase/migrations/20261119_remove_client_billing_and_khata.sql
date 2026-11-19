-- ============================================================
-- Clean Removal: Drop Client Billing, Inward Receipts & Khata
-- ============================================================

DROP TABLE IF EXISTS public.client_receipts CASCADE;
DROP TABLE IF EXISTS public.client_invoices CASCADE;
DROP TABLE IF EXISTS public.profile_clients CASCADE;
DROP TABLE IF EXISTS public.vendor_payments CASCADE;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
