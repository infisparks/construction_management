import { supabase } from './client';
import { STORAGE_BUCKET, resolveFileUrl } from './project-files';

export interface ProjectSubDocument {
  id: string;
  parent_document_id: string;
  project_id?: string | null;
  title: string;
  note_text?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  file_type: 'pdf' | 'image' | 'spreadsheet' | 'note' | 'other';
  file_size: number;
  uploaded_by: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'construction_erp_sub_documents_v1';

/**
 * Read cached local storage sub-documents
 */
function getLocalSubDocs(): ProjectSubDocument[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save cached local storage sub-documents
 */
function setLocalSubDocs(list: ProjectSubDocument[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('LocalStorage quota exceeded for sub-documents:', err);
  }
}

/**
 * Fetch sub-documents for a given parent document.
 * Queries Supabase database, and falls back to LocalStorage cache seamlessly.
 */
export async function fetchSubDocuments(
  parentDocumentId: string,
  isDeleted: boolean = false
): Promise<ProjectSubDocument[]> {
  const localList = getLocalSubDocs();
  const localFiltered = localList.filter(
    (d) => d.parent_document_id === parentDocumentId && Boolean(d.is_deleted) === isDeleted
  );

  try {
    const { data, error } = await supabase
      .from('project_sub_documents')
      .select('*')
      .eq('parent_document_id', parentDocumentId)
      .eq('is_deleted', isDeleted)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Sync local cache with remote records
      const remoteIds = new Set(data.map((d: any) => d.id));
      const preservedOtherDocs = localList.filter((d) => d.parent_document_id !== parentDocumentId);
      setLocalSubDocs([...preservedOtherDocs, ...data]);
      return data as ProjectSubDocument[];
    }
  } catch (err) {
    console.warn('Supabase fetchSubDocuments fallback to local cache:', err);
  }

  // Sort descending by created_at
  return localFiltered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Count active sub-documents for multiple parent document IDs (for table view badges)
 */
export async function fetchSubDocumentsCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const localList = getLocalSubDocs();

  // Count from local first
  localList.forEach((d) => {
    if (!d.is_deleted) {
      counts[d.parent_document_id] = (counts[d.parent_document_id] || 0) + 1;
    }
  });

  try {
    const { data, error } = await supabase
      .from('project_sub_documents')
      .select('parent_document_id')
      .eq('is_deleted', false);

    if (!error && data) {
      const dbCounts: Record<string, number> = {};
      data.forEach((r: any) => {
        dbCounts[r.parent_document_id] = (dbCounts[r.parent_document_id] || 0) + 1;
      });
      return { ...counts, ...dbCounts };
    }
  } catch {}

  return counts;
}

/**
 * Upload binary file for a sub-document to Supabase storage
 */
export async function uploadSubDocumentFile(
  file: File
): Promise<{ publicUrl: string; filePath: string }> {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `sub_documents/${Date.now()}_${cleanFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.warn('Storage upload error for sub-doc, using data URL fallback:', uploadError);
    // Base64 fallback if storage bucket returns error
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return { publicUrl: b64, filePath: '' };
  }

  const publicUrl = resolveFileUrl(filePath);
  return { publicUrl, filePath };
}

/**
 * Create a new sub-document (attachment or note)
 */
export async function createSubDocument(
  data: Partial<ProjectSubDocument>
): Promise<ProjectSubDocument> {
  const now = new Date().toISOString();
  const newRecord: ProjectSubDocument = {
    id: data.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`),
    parent_document_id: data.parent_document_id!,
    project_id: data.project_id || null,
    title: data.title || 'Attached Document',
    note_text: data.note_text || null,
    file_name: data.file_name || null,
    file_url: data.file_url || null,
    file_type: data.file_type || 'pdf',
    file_size: Number(data.file_size) || 0,
    uploaded_by: data.uploaded_by || 'admin@gmail.com',
    is_deleted: false,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };

  // 1. Immediately store in local cache
  const localList = getLocalSubDocs();
  setLocalSubDocs([newRecord, ...localList.filter((d) => d.id !== newRecord.id)]);

  // 2. Insert into Supabase
  try {
    const { data: dbData, error } = await supabase
      .from('project_sub_documents')
      .insert([newRecord])
      .select()
      .single();

    if (!error && dbData) {
      const finalRec = dbData as ProjectSubDocument;
      const updatedLocal = getLocalSubDocs().map((d) => (d.id === newRecord.id ? finalRec : d));
      setLocalSubDocs(updatedLocal);
      return finalRec;
    }
  } catch (err) {
    console.warn('Supabase createSubDocument fallback to local:', err);
  }

  return newRecord;
}

/**
 * Soft delete sub-document (is_deleted = true, hides from list)
 */
export async function softDeleteSubDocument(id: string): Promise<boolean> {
  const now = new Date().toISOString();

  // 1. Update local cache
  const localList = getLocalSubDocs();
  setLocalSubDocs(
    localList.map((d) => (d.id === id ? { ...d, is_deleted: true, deleted_at: now } : d))
  );

  // 2. Update Supabase
  try {
    const { error } = await supabase
      .from('project_sub_documents')
      .update({ is_deleted: true, deleted_at: now })
      .eq('id', id);

    if (!error) return true;
  } catch (err) {
    console.warn('Supabase softDeleteSubDocument error:', err);
  }

  return true;
}

/**
 * Restore a soft-deleted sub-document
 */
export async function restoreSubDocument(id: string): Promise<boolean> {
  const now = new Date().toISOString();

  // 1. Update local cache
  const localList = getLocalSubDocs();
  setLocalSubDocs(
    localList.map((d) => (d.id === id ? { ...d, is_deleted: false, deleted_at: null } : d))
  );

  // 2. Update Supabase
  try {
    const { error } = await supabase
      .from('project_sub_documents')
      .update({ is_deleted: false, deleted_at: null, updated_at: now })
      .eq('id', id);

    if (!error) return true;
  } catch (err) {
    console.warn('Supabase restoreSubDocument error:', err);
  }

  return true;
}

/**
 * Update an existing sub-document (title, note text, or file info)
 */
export async function updateSubDocument(
  id: string,
  updates: Partial<Pick<ProjectSubDocument, 'title' | 'note_text' | 'file_name' | 'file_url' | 'file_type' | 'file_size'>>
): Promise<ProjectSubDocument | null> {
  const now = new Date().toISOString();

  // 1. Update local cache immediately
  const localList = getLocalSubDocs();
  let updatedRec: ProjectSubDocument | null = null;
  const updatedList = localList.map((d) => {
    if (d.id === id) {
      updatedRec = { ...d, ...updates, updated_at: now };
      return updatedRec;
    }
    return d;
  });
  setLocalSubDocs(updatedList);

  // 2. Update Supabase database
  try {
    const { data, error } = await supabase
      .from('project_sub_documents')
      .update({ ...updates, updated_at: now })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return data as ProjectSubDocument;
    }
  } catch (err) {
    console.warn('Supabase updateSubDocument error:', err);
  }

  return updatedRec;
}

/**
 * Permanently delete a sub-document
 */
export async function permanentDeleteSubDocument(id: string): Promise<boolean> {
  // 1. Remove from local cache
  const localList = getLocalSubDocs();
  setLocalSubDocs(localList.filter((d) => d.id !== id));

  // 2. Delete from Supabase
  try {
    const { error } = await supabase
      .from('project_sub_documents')
      .delete()
      .eq('id', id);

    if (!error) return true;
  } catch (err) {
    console.warn('Supabase permanentDeleteSubDocument error:', err);
  }

  return true;
}
