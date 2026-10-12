'use client';

import { DbProject } from './types';
import { supabase } from './client';

export const ACTIVE_SITE_ID_KEY = 'infibuild_active_site_id';
export const ACTIVE_SITE_DATA_KEY = 'infibuild_active_site_data';

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
 * Store active site in localStorage
 */
export function setStoredActiveSite(project: DbProject): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_SITE_ID_KEY, project.id);
    localStorage.setItem(ACTIVE_SITE_DATA_KEY, JSON.stringify(project));
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
    return (data as DbProject[]) || [];
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
