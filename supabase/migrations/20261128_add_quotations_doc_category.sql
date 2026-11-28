-- Safely add 'Quotations and purchase orders' to document_category in public.category
-- Preserves all existing & custom categories without overwriting.

INSERT INTO public.category (name, value)
VALUES (
  'document_category',
  '["Site photographs and reports","Architectural drawings","Structural and RCC drawings","MEP drawings","BOQs and cost estimates","Contracts and agreements","Legal and statutory documents","Quotations and purchase orders","Meeting minutes and correspondence","Quality, safety and handover documents","Project information"]'::jsonb
)
ON CONFLICT (name) DO UPDATE
SET
  value = CASE
    WHEN NOT (public.category.value @> '["Quotations and purchase orders"]'::jsonb)
    THEN public.category.value || '["Quotations and purchase orders"]'::jsonb
    ELSE public.category.value
  END;
