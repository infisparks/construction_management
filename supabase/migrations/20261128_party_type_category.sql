-- Save Party Types in public.category ('party_type') without "Other"
-- and allow custom party types in public.profile_vendor.type without harming existing data.

INSERT INTO public.category (name, value)
VALUES (
  'party_type',
  '["Material Supplier", "Subcontractor", "Client / Owner"]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Safely drop any CHECK constraint on public.profile_vendor.type so custom party types can be stored
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'profile_vendor'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.profile_vendor DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;
