-- ==============================================================================
-- Migration: Remove Quotations/POs and Invoices/Bills from document_category
-- ==============================================================================

UPDATE public.category
SET
  value = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements_text(value) AS elem
    WHERE elem NOT ILIKE '%quotation%'
      AND elem NOT ILIKE '%purchase order%'
      AND elem NOT ILIKE '%invoice%'
      AND elem NOT ILIKE '%bill%'
  ),
  updated_at = NOW()
WHERE name = 'document_category';
