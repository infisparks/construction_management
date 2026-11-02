-- Migration: Add engineer_name column to inventory_transactions
-- Description: Stores the site / project engineer name for inventory vouchers.
-- If not entered by the user, this remains NULL / empty, and is omitted from the PDF voucher.

ALTER TABLE IF EXISTS public.inventory_transactions 
ADD COLUMN IF NOT EXISTS engineer_name TEXT;

-- Create an index to support fast lookups/filtering by engineer if needed
CREATE INDEX IF NOT EXISTS idx_inv_tx_engineer_name ON public.inventory_transactions(engineer_name);

