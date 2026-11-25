-- ==============================================================================
-- Migration: Ensure soft-delete column & reconcile profile_product.current_stock
-- with the active inventory_transactions ledger.
-- ==============================================================================

-- 1. Ensure is_deleted column and index exist on inventory_transactions
ALTER TABLE IF EXISTS public.inventory_transactions
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_inv_tx_is_deleted
ON public.inventory_transactions(is_deleted);

-- 2. Backfill missing product_id on any transactions that only have product_code
UPDATE public.inventory_transactions AS t
SET product_id = p.id
FROM public.profile_product AS p
WHERE t.product_id IS NULL
  AND t.product_code IS NOT NULL
  AND t.product_code = p.code;

-- 3. Reconcile profile_product.current_stock for all products with ledger entries
-- Formula: Total Active Check-In - (Total Active Check-Out + Return + Damage)
WITH ledger_totals AS (
  SELECT
    p.id AS product_id,
    GREATEST(
      0,
      ROUND(
        COALESCE(SUM(
          CASE
            WHEN COALESCE(t.is_deleted, FALSE) = TRUE
              OR (t.notes IS NOT NULL AND t.notes LIKE '[DELETED]%')
              THEN 0
            WHEN LOWER(t.type) IN ('in', 'check_in')
              THEN COALESCE(t.quantity, 0)
            ELSE -COALESCE(t.quantity, 0)
          END
        ), 0)::numeric,
        2
      )
    ) AS accurate_stock
  FROM public.profile_product p
  INNER JOIN public.inventory_transactions t
    ON (t.product_id = p.id OR (p.code IS NOT NULL AND t.product_code = p.code))
  GROUP BY p.id
)
UPDATE public.profile_product AS p
SET
  current_stock = l.accurate_stock,
  updated_at = NOW()
FROM ledger_totals AS l
WHERE p.id = l.product_id;
