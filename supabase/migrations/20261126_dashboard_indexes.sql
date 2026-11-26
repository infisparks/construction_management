-- ============================================================================
-- Director Dashboard Performance Indexes (Safe & Idempotent)
-- Run this in Supabase SQL Editor to speed up Dashboard & Module queries.
-- ============================================================================

-- 1. Site Expenses (Bills & Expenses)
CREATE INDEX IF NOT EXISTS idx_site_expenses_active_date
  ON public.site_expenses (is_deleted, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_site_expenses_project_active
  ON public.site_expenses (project_id, is_deleted, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_site_expenses_status_active
  ON public.site_expenses (payment_status, is_deleted);

-- 2. Files & Documents Archive
CREATE INDEX IF NOT EXISTS idx_project_files_active_project
  ON public.project_files (is_deleted, project_id, created_at DESC);

-- 3. Material Store (Catalog & Transactions)
CREATE INDEX IF NOT EXISTS idx_profile_product_active_stock
  ON public.profile_product (is_deleted, current_stock);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_active_date
  ON public.inventory_transactions (is_deleted, transaction_date DESC, created_at DESC);

-- 4. Construction Timeline & Tasks
CREATE INDEX IF NOT EXISTS idx_plan_tasks_project_active
  ON public.plan_tasks (project_id, is_deleted);
