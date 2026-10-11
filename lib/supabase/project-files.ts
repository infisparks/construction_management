import { supabase } from './client';
import { ProjectFile } from '@/lib/construction-planning/types';

export interface ProjectOption {
  id: string;
  serial_no: number;
  name: string;
}

export const STORAGE_BUCKET = 'project-documents';

/**
 * Extracts strictly the relative path inside the Supabase Storage bucket.
 * Strips origin domains (e.g. `https://xxx.supabase.co/storage/v1/object/public/project-documents/`
 * or any custom self-hosted domain), leaving only `folder/filename.ext`.
 * This guarantees database records remain completely portable when migrating to self-hosted Supabase.
 */
export function extractStoragePath(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';

  // Local object or data URLs (offline or instant client preview)
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // If the path contains the storage bucket name, extract everything after it
  const bucketMatch = trimmed.match(new RegExp(`/${STORAGE_BUCKET}/(.+)$`));
  if (bucketMatch && bucketMatch[1]) {
    return bucketMatch[1].split('?')[0].replace(/^\/+/, '');
  }

  // If a full HTTP/HTTPS URL is provided without the explicit bucket pattern
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const urlObj = new URL(trimmed);
      const pathname = urlObj.pathname.replace(/^\/+/, '');
      const storagePrefix = `storage/v1/object/public/${STORAGE_BUCKET}/`;
      if (pathname.includes(storagePrefix)) {
        return pathname.split(storagePrefix)[1] || pathname;
      }
      return pathname;
    } catch {
      return trimmed;
    }
  }

  // Already a clean relative path
  return trimmed.replace(/^\/+/, '');
}

/**
 * Dynamically resolves a relative storage path (or legacy URL) into
 * an active public URL using the currently configured Supabase client.
 * When the user switches to self-hosted Supabase and updates NEXT_PUBLIC_SUPABASE_URL,
 * all URLs dynamically point to the new domain without needing database modifications.
 */
export function resolveFileUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const cleanPath = extractStoragePath(trimmed);
  if (!cleanPath) return '';

  // Generate dynamic public URL from the currently active Supabase instance
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(cleanPath);

  return data?.publicUrl || cleanPath;
}

/**
 * Fetch all projects from `public.projects` for dropdown filter and linking.
 */
export async function fetchAvailableProjects(): Promise<ProjectOption[]> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, serial_no, name')
      .eq('is_deleted', false)
      .order('serial_no', { ascending: true });

    if (error) {
      console.error('Error fetching available projects:', error);
      return [];
    }
    return (data || []) as ProjectOption[];
  } catch (err) {
    console.error('Failed to fetch available projects:', err);
    return [];
  }
}

/**
 * Fetch all documents with relational project foreign key data.
 * Transforms relative stored paths into dynamically resolved active URLs for the client.
 * @param projectId Optional project ID filter (or 'all')
 * @param isDeleted Filter by active (false) or deleted (true)
 */
export async function fetchProjectFiles(
  projectId?: string,
  isDeleted: boolean = false
): Promise<ProjectFile[]> {
  try {
    let query = supabase
      .from('project_files')
      .select('*, project:projects(id, serial_no, name)')
      .eq('is_deleted', isDeleted)
      .order('created_at', { ascending: false });

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching project files:', error);
      return [];
    }

    // Map rows: attach clean storage_path and dynamically resolve file_url based on active domain
    const resolvedData = (data || []).map((file: any) => {
      const cleanPath = extractStoragePath(file.file_url);
      return {
        ...file,
        storage_path: cleanPath || undefined,
        file_url: cleanPath ? resolveFileUrl(cleanPath) : (file.file_url || ''),
      } as ProjectFile;
    });

    return resolvedData;
  } catch (err) {
    console.error('Failed to fetch project files:', err);
    return [];
  }
}

/**
 * Upload a binary file to the Supabase Storage bucket `project-documents`.
 * Returns the relative path for database storage and the dynamically resolved public URL.
 */
export async function uploadFileToStorage(
  file: File,
  projectFolder: string = 'general'
): Promise<{ publicUrl: string; filePath: string }> {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${projectFolder}/${Date.now()}_${cleanFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const publicUrl = resolveFileUrl(filePath);

  return {
    publicUrl,
    filePath, // Relative storage path to save in the database
  };
}

/**
 * Insert a new document record into `public.project_files` with foreign key `project_id`.
 * Strictly saves the relative storage path in `file_url`, never hardcoded host domains.
 */
export async function createProjectFileRecord(
  fileData: Omit<ProjectFile, 'id' | 'created_at'>
): Promise<ProjectFile | null> {
  try {
    // Exclude relational nested 'project' and helper 'storage_path' field on insert
    const { project, storage_path, ...insertPayload } = fileData as any;

    // Guarantee that ONLY relative path is stored in the database
    const relativePath = extractStoragePath(insertPayload.file_url);

    const { data, error } = await supabase
      .from('project_files')
      .insert([{
        ...insertPayload,
        file_url: relativePath || null,
        is_deleted: false,
      }])
      .select('*, project:projects(id, serial_no, name)')
      .single();

    if (error) {
      console.error('Error inserting project file:', error);
      throw error;
    }

    const savedCleanPath = extractStoragePath(data.file_url);

    return {
      ...data,
      storage_path: savedCleanPath || undefined,
      file_url: savedCleanPath ? resolveFileUrl(savedCleanPath) : data.file_url,
    } as ProjectFile;
  } catch (err) {
    console.error('Failed to create project file record:', err);
    throw err;
  }
}

/**
 * Soft delete a file (moves to Recycle Bin).
 */
export async function softDeleteProjectFile(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_files')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error soft deleting project file:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Failed to soft delete project file:', err);
    throw err;
  }
}

/**
 * Restore a deleted file back from the Recycle Bin.
 */
export async function restoreProjectFile(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_files')
      .update({
        is_deleted: false,
        deleted_at: null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error restoring project file:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Failed to restore project file:', err);
    throw err;
  }
}

/**
 * Permanently purge a document record from database and storage.
 */
export async function permanentDeleteProjectFile(
  id: string,
  filePathOrUrl?: string
): Promise<boolean> {
  try {
    if (filePathOrUrl) {
      const cleanPath = extractStoragePath(filePathOrUrl);
      if (cleanPath && !cleanPath.startsWith('blob:') && !cleanPath.startsWith('data:')) {
        await supabase.storage.from(STORAGE_BUCKET).remove([cleanPath]);
      }
    }

    const { error } = await supabase
      .from('project_files')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error permanently deleting project file:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Failed to permanently delete project file:', err);
    throw err;
  }
}

/**
 * Empty the Recycle Bin permanently for a project (or all projects).
 */
export async function emptyRecycleBin(projectId?: string): Promise<boolean> {
  try {
    let query = supabase.from('project_files').delete().eq('is_deleted', true);

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    const { error } = await query;
    if (error) {
      console.error('Error emptying recycle bin:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Failed to empty recycle bin:', err);
    throw err;
  }
}

/**
 * Toggle starred status.
 */
export async function toggleStarProjectFile(
  id: string,
  isStarred: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_files')
      .update({ is_starred: isStarred })
      .eq('id', id);

    if (error) {
      console.error('Error toggling star:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to toggle star:', err);
    return false;
  }
}
