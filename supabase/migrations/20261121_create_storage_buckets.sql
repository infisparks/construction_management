-- ============================================================
-- Supabase Storage Buckets Migration:
-- 1. project-documents (Drawings, Site Photos, Documents, Contracts)
-- 2. expense-documents (Bills, Invoices, Receipts)
-- ============================================================

-- 1. Create project-documents bucket (50MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  true,
  52428800,
  NULL
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create expense-documents bucket (50MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-documents',
  'expense-documents',
  true,
  52428800,
  NULL
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage Policies for project-documents
DROP POLICY IF EXISTS "Public View project-documents" ON storage.objects;
CREATE POLICY "Public View project-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "Public Upload project-documents" ON storage.objects;
CREATE POLICY "Public Upload project-documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "Public Update project-documents" ON storage.objects;
CREATE POLICY "Public Update project-documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "Public Delete project-documents" ON storage.objects;
CREATE POLICY "Public Delete project-documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-documents');

-- 4. Storage Policies for expense-documents
DROP POLICY IF EXISTS "Public View expense-documents" ON storage.objects;
CREATE POLICY "Public View expense-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-documents');

DROP POLICY IF EXISTS "Public Upload expense-documents" ON storage.objects;
CREATE POLICY "Public Upload expense-documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'expense-documents');

DROP POLICY IF EXISTS "Public Update expense-documents" ON storage.objects;
CREATE POLICY "Public Update expense-documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'expense-documents');

DROP POLICY IF EXISTS "Public Delete expense-documents" ON storage.objects;
CREATE POLICY "Public Delete expense-documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'expense-documents');
