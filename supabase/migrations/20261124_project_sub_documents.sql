-- ==============================================================================
-- Migration: Create project_sub_documents table
-- Allows attaching sub-documents, PDFs, drawings, photos, or text notes to any parent document.
-- Features:
--   - Foreign key to public.project_files(id) with CASCADE on delete
--   - Soft delete support: is_deleted = true hides the record
--   - Tracks who uploaded (uploaded_by) and created_at timestamp
--   - Full RLS policies for authenticated and anon users
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.project_sub_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_document_id UUID NOT NULL REFERENCES public.project_files(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    note_text TEXT,
    file_name TEXT,
    file_url TEXT,
    file_type TEXT DEFAULT 'document',
    file_size BIGINT DEFAULT 0,
    uploaded_by TEXT DEFAULT 'admin@gmail.com',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimized indexes for fast parent document lookups and status filtering
CREATE INDEX IF NOT EXISTS idx_sub_docs_parent ON public.project_sub_documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_sub_docs_deleted ON public.project_sub_documents(is_deleted);
CREATE INDEX IF NOT EXISTS idx_sub_docs_created ON public.project_sub_documents(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.project_sub_documents ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any exist
DROP POLICY IF EXISTS "Allow select on project_sub_documents" ON public.project_sub_documents;
DROP POLICY IF EXISTS "Allow insert on project_sub_documents" ON public.project_sub_documents;
DROP POLICY IF EXISTS "Allow update on project_sub_documents" ON public.project_sub_documents;
DROP POLICY IF EXISTS "Allow delete on project_sub_documents" ON public.project_sub_documents;

-- Create open access policies for app operations
CREATE POLICY "Allow select on project_sub_documents" 
ON public.project_sub_documents FOR SELECT 
USING (true);

CREATE POLICY "Allow insert on project_sub_documents" 
ON public.project_sub_documents FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update on project_sub_documents" 
ON public.project_sub_documents FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete on project_sub_documents" 
ON public.project_sub_documents FOR DELETE 
USING (true);
