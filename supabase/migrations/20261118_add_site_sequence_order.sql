-- ============================================================
-- Migration: Add sequence_order to public.projects
-- Purpose: Allow custom user-controlled sequencing and reordering of construction sites
-- ============================================================

-- 1. Add sequence_order column if not already present
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;

-- 2. Create index on sequence_order for fast ordering across the app
CREATE INDEX IF NOT EXISTS idx_projects_sequence_order ON public.projects(sequence_order);

-- 3. Backfill sequence_order to place SITE OFFICE first, followed by Noori Group and wings A, B, C, D:
UPDATE public.projects 
SET sequence_order = 1 
WHERE LOWER(name) LIKE '%site office%';

UPDATE public.projects 
SET sequence_order = 2 
WHERE LOWER(name) = 'noori horizone' OR LOWER(name) = 'noori horizon';

UPDATE public.projects 
SET sequence_order = 3 
WHERE LOWER(name) LIKE '%a wing%';

UPDATE public.projects 
SET sequence_order = 4 
WHERE LOWER(name) LIKE '%b wing%';

UPDATE public.projects 
SET sequence_order = 5 
WHERE LOWER(name) LIKE '%c wing%';

UPDATE public.projects 
SET sequence_order = 6 
WHERE LOWER(name) LIKE '%d wing%';

-- Any other active projects get sequential numbers after 6
WITH unassigned AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY serial_no ASC, created_at ASC) + 6 AS new_order
  FROM public.projects
  WHERE sequence_order IS NULL OR sequence_order = 0
)
UPDATE public.projects p
SET sequence_order = u.new_order
FROM unassigned u
WHERE p.id = u.id;

-- 4. Keep serial_no synchronized with sequence_order for full backward compatibility
UPDATE public.projects
SET serial_no = sequence_order
WHERE sequence_order IS NOT NULL AND sequence_order > 0;
