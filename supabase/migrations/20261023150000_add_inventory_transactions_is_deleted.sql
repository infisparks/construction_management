-- Migration: Add is_deleted to inventory_transactions for soft-delete & recycle bin
ALTER TABLE IF EXISTS public.inventory_transactions 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_inv_tx_is_deleted ON public.inventory_transactions(is_deleted);
