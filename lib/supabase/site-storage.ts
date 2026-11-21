'use client';

import { DbProject } from './types';
import { supabase } from './client';

export const ACTIVE_SITE_ID_KEY = 'infibuild_active_site_id';
export const ACTIVE_SITE_DATA_KEY = 'infibuild_active_site_data';
export const SITE_SEQUENCE_KEY = 'infibuild_site_sequence';

/**
 * Get custom site sequence IDs from localStorage
 */
export function getStoredSiteSequence(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SITE_SEQUENCE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Set custom site sequence IDs in localStorage
 */
export function setStoredSiteSequence(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SITE_SEQUENCE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent('site-sequence-updated', { detail: { sequence: ids } }));
  } catch (err) {
    console.warn('Failed to save site sequence to localStorage:', err);
  }
}

/**
 * Sorts any project list according to custom sequence:
 * 1. Explicit sequence from localStorage
 * 2. sequence_order column from Supabase (if available)
 * 3. serial_no column
 */
export function sortProjectsBySequence<T extends { id: string; name?: string; serial_no?: number; sequence_order?: number | null }>(
  list: T[]
): T[] {
  const localSeq = getStoredSiteSequence();
  if (localSeq && localSeq.length > 0) {
    const seqMap = new Map<string, number>();
    localSeq.forEach((id, index) => seqMap.set(id, index));

    return [...list].sort((a, b) => {
      const idxA = seqMap.has(a.id) ? seqMap.get(a.id)! : 9999;
      const idxB = seqMap.has(b.id) ? seqMap.get(b.id)! : 9999;
      if (idxA !== idxB) return idxA - idxB;

      const orderA = a.sequence_order !== undefined && a.sequence_order !== null ? a.sequence_order : (a.serial_no ?? 9999);
      const orderB = b.sequence_order !== undefined && b.sequence_order !== null ? b.sequence_order : (b.serial_no ?? 9999);
      return orderA - orderB;
    });
  }

  return [...list].sort((a, b) => {
    const orderA = a.sequence_order !== undefined && a.sequence_order !== null ? a.sequence_order : (a.serial_no ?? 9999);
    const orderB = b.sequence_order !== undefined && b.sequence_order !== null ? b.sequence_order : (b.serial_no ?? 9999);
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Persists the new project sequence order to:
 * 1. LocalStorage for immediate cross-tab synchronization
 * 2. Supabase projects table (updates both serial_no and sequence_order)
 */
export async function updateSitesOrder(orderedProjects: DbProject[]): Promise<boolean> {
  try {
    // 1. Immediately store sequence IDs locally
    const ids = orderedProjects.map((p) => p.id);
    setStoredSiteSequence(ids);

    // 2. Persist order back to Supabase database for each project
    const updatePromises = orderedProjects.map(async (project, index) => {
      const newOrder = index + 1;
      // Try updating serial_no (standard) and sequence_order (if column exists)
      const { error } = await supabase
        .from('projects')
        .update({
          serial_no: newOrder,
          sequence_order: newOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      // If sequence_order column doesn't exist yet, retry updating serial_no only
      if (error && error.message?.includes('sequence_order')) {
        await supabase
          .from('projects')
          .update({
            serial_no: newOrder,
            updated_at: new Date().toISOString(),
          })
          .eq('id', project.id);
      }
    });

    await Promise.all(updatePromises);
    return true;
  } catch (err) {
    console.error('Failed to update sites order in Supabase:', err);
    return false;
  }
}

/**
 * Get active site ID from localStorage (SSR-safe)
 */
export function getStoredActiveSiteId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_SITE_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Get active site data object from localStorage (SSR-safe)
 */
export function getStoredActiveSite(): DbProject | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_SITE_DATA_KEY);
    return raw ? (JSON.parse(raw) as DbProject) : null;
  } catch {
    return null;
  }
}

/**
 * Store active site in localStorage
 */
export function setStoredActiveSite(project: DbProject): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_SITE_ID_KEY, project.id);
    localStorage.setItem(ACTIVE_SITE_DATA_KEY, JSON.stringify(project));
    window.dispatchEvent(new CustomEvent('active-site-changed', { detail: { project } }));
  } catch (err) {
    console.warn('Failed to save active site to localStorage:', err);
  }
}

/**
 * Store active site ID only
 */
export function setStoredActiveSiteId(siteId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_SITE_ID_KEY, siteId);
  } catch (err) {
    console.warn('Failed to save active site ID to localStorage:', err);
  }
}

/**
 * Clear stored active site from localStorage
 */
export function clearStoredActiveSite(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_SITE_ID_KEY);
    localStorage.removeItem(ACTIVE_SITE_DATA_KEY);
  } catch {
    // ignore
  }
}

/**
 * Fetch all active sites from Supabase public.projects
 */
export async function fetchAllActiveSites(includeDeleted: boolean = false): Promise<DbProject[]> {
  try {
    let query = supabase.from('projects').select('*').order('serial_no', { ascending: true });
    if (!includeDeleted) {
      query = query.eq('is_deleted', false);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching sites from Supabase:', error);
      return [];
    }
    const rawProjects = (data as DbProject[]) || [];
    return sortProjectsBySequence(rawProjects);
  } catch (err) {
    console.error('Error in fetchAllActiveSites:', err);
    return [];
  }
}

/**
 * Resolve current active site:
 * 1. Read stored ID from localStorage
 * 2. Fetch projects from database
 * 3. Match stored ID; if found, return it
 * 4. If no stored ID or not found, fall back to first site and persist it
 * 5. If zero sites in DB, returns null (caller should redirect to /sites)
 */
export async function resolveActiveSite(): Promise<{
  activeProject: DbProject | null;
  allProjects: DbProject[];
}> {
  const allProjects = await fetchAllActiveSites(false);

  if (allProjects.length === 0) {
    clearStoredActiveSite();
    return { activeProject: null, allProjects: [] };
  }

  // 1. Check URL query parameters (highest priority for multi-site tabs)
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlSiteId = params.get('site') || params.get('siteId') || params.get('projectId');
      if (urlSiteId) {
        const matchedUrl = allProjects.find((p) => p.id === urlSiteId);
        if (matchedUrl) {
          setStoredActiveSite(matchedUrl);
          return { activeProject: matchedUrl, allProjects };
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Check localStorage
  const storedId = getStoredActiveSiteId();
  if (storedId) {
    const matched = allProjects.find((p) => p.id === storedId);
    if (matched) {
      setStoredActiveSite(matched);
      return { activeProject: matched, allProjects };
    }
  }

  // 3. Fallback to first available project and persist
  const defaultProject = allProjects[0];
  setStoredActiveSite(defaultProject);
  return { activeProject: defaultProject, allProjects };
}
