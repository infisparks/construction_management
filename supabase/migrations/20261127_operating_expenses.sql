-- =============================================================================
-- Production Unified Operating Expenses Table (Petty Cash + Other Expenses)
-- Single table architecture using `expense_type` discriminator:
--   - 'petty_cash'    : Daily site petty cash vouchers & small cash spend
--   - 'other_expense' : Staff salaries, office rent, utilities, admin & misc
-- Audit & Safety:
--   - Auto-captures auth.uid() on insert (created_by_id), update (updated_by_id),
--     and soft-delete (deleted_by_id + deleted_at).
--   - Soft-delete ONLY (is_deleted = true). Permanent DELETE is blocked at DB level.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.operating_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_type text NOT NULL CHECK (expense_type IN ('petty_cash', 'other_expense')),
  entry_code text,
  project_id uuid NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  category text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  paid_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  payment_method text NOT NULL DEFAULT 'cash',
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'pending')),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_no text,
  notes text,
  custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text,
  created_by_id uuid DEFAULT auth.uid(),
  updated_by_id uuid DEFAULT auth.uid(),
  deleted_by_id uuid,
  deleted_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- If table already existed from earlier run, ensure audit & custom_fields columns exist and drop legacy columns
ALTER TABLE public.operating_expenses
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by_id uuid DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS updated_by_id uuid DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS deleted_by_id uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  DROP COLUMN IF EXISTS payee_name,
  DROP COLUMN IF EXISTS payee_role,
  DROP COLUMN IF EXISTS salary_month;

-- Seed default categories & category column templates in public.category
INSERT INTO public.category (name, value)
VALUES
  (
    'petty_cash_category',
    '["Site Refreshments & Tea","Local Conveyance & Auto","Hardware & Small Tools","Courier & Stationery","Labour Welfare / Misc","Emergency Site Cash","Other Petty Cash"]'::jsonb
  ),
  (
    'other_expense_category',
    '["Staff Salary","Engineer / Supervisor Salary","Office Rent","Electricity & Internet","Vehicle & Fuel","Legal & Consultancy","Marketing & Admin","Other Operating Expense"]'::jsonb
  ),
  (
    'operating_category_fields',
    '[{"category":"Staff Salary","fields":["Employee Name","Designation","Salary Month"]},{"category":"Engineer / Supervisor Salary","fields":["Engineer Name","Site / Role","Salary Month"]},{"category":"Office Rent","fields":["Landlord Name","Property / Office","Rent Month"]},{"category":"Electricity & Internet","fields":["Provider / Meter No","Billing Month"]},{"category":"Vehicle & Fuel","fields":["Vehicle No","Driver Name","Fuel / Service"]}]'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- Production Indexes for fast filtering & dashboard aggregation
CREATE INDEX IF NOT EXISTS idx_operating_expenses_type_date
  ON public.operating_expenses (expense_type, is_deleted, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_operating_expenses_project
  ON public.operating_expenses (project_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_operating_expenses_created_by_id
  ON public.operating_expenses (created_by_id);

CREATE INDEX IF NOT EXISTS idx_operating_expenses_created_at
  ON public.operating_expenses (created_at DESC)
  WHERE is_deleted = false;

-- Auto-populate audit columns (auth.uid()) & updated_at on INSERT / UPDATE
CREATE OR REPLACE FUNCTION public.handle_operating_expenses_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by_id IS NULL THEN
      NEW.created_by_id := auth.uid();
    END IF;
    NEW.updated_by_id := COALESCE(NEW.updated_by_id, auth.uid());
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.created_by_id := OLD.created_by_id;
    NEW.created_at := OLD.created_at;
    NEW.updated_by_id := COALESCE(auth.uid(), NEW.updated_by_id, OLD.updated_by_id);
    NEW.updated_at := now();

    IF NEW.is_deleted = true AND COALESCE(OLD.is_deleted, false) = false THEN
      NEW.deleted_by_id := COALESCE(auth.uid(), NEW.deleted_by_id);
      NEW.deleted_at := now();
    ELSIF NEW.is_deleted = false AND OLD.is_deleted = true THEN
      NEW.deleted_by_id := NULL;
      NEW.deleted_at := NULL;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_operating_expenses_updated_at ON public.operating_expenses;
DROP TRIGGER IF EXISTS trg_operating_expenses_audit ON public.operating_expenses;
CREATE TRIGGER trg_operating_expenses_audit
  BEFORE INSERT OR UPDATE ON public.operating_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_operating_expenses_audit();

-- Enable Row Level Security (RLS) — Soft-delete only (NO DELETE policy)
ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read operating_expenses" ON public.operating_expenses;
CREATE POLICY "Allow authenticated read operating_expenses"
  ON public.operating_expenses FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert operating_expenses" ON public.operating_expenses;
CREATE POLICY "Allow authenticated insert operating_expenses"
  ON public.operating_expenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update operating_expenses" ON public.operating_expenses;
CREATE POLICY "Allow authenticated update operating_expenses"
  ON public.operating_expenses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Explicitly drop any permanent DELETE policy so rows are never permanently deleted
DROP POLICY IF EXISTS "Allow authenticated delete operating_expenses" ON public.operating_expenses;

-- Fast Dashboard Summary RPC (strictly ignores is_deleted = true)
CREATE OR REPLACE FUNCTION public.get_operating_expenses_summary(
  p_project_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  petty_cash_total numeric,
  petty_cash_paid numeric,
  petty_cash_count bigint,
  other_expense_total numeric,
  other_expense_paid numeric,
  other_expense_count bigint,
  salary_total numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN expense_type = 'petty_cash' THEN amount ELSE 0 END), 0) AS petty_cash_total,
    COALESCE(SUM(CASE WHEN expense_type = 'petty_cash' THEN paid_amount ELSE 0 END), 0) AS petty_cash_paid,
    COUNT(*) FILTER (WHERE expense_type = 'petty_cash') AS petty_cash_count,
    COALESCE(SUM(CASE WHEN expense_type = 'other_expense' THEN amount ELSE 0 END), 0) AS other_expense_total,
    COALESCE(SUM(CASE WHEN expense_type = 'other_expense' THEN paid_amount ELSE 0 END), 0) AS other_expense_paid,
    COUNT(*) FILTER (WHERE expense_type = 'other_expense') AS other_expense_count,
    COALESCE(SUM(CASE WHEN expense_type = 'other_expense' AND category ILIKE '%salary%' THEN amount ELSE 0 END), 0) AS salary_total
  FROM public.operating_expenses
  WHERE is_deleted = false
    AND (p_project_id IS NULL OR project_id = p_project_id)
    AND (p_start_date IS NULL OR expense_date >= p_start_date)
    AND (p_end_date IS NULL OR expense_date <= p_end_date);
$$;
